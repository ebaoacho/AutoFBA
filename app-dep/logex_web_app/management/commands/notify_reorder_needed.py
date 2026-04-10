from collections import defaultdict

import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import OuterRef, Subquery
from django.utils import timezone

from logex_web_app.models import ChatworkRoom, ReorderNotificationState, SKUConfig
from logex_web_app.views import calculate_real_daily_sales_estimate


RESERVED_SKUS = {"__sp_api_token__"}


class Command(BaseCommand):
    help = '納品が必要になったSKUを検知し、Chatworkへ通知します。cronから1時間ごとに実行してください。'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='通知送信はせず、対象SKUだけを表示します。',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        latest_configs = self._get_latest_configs()
        grouped_configs = self._group_by_owner_and_sku(latest_configs)
        activated_by_owner = self._update_states(grouped_configs)

        if not activated_by_owner:
            self.stdout.write(self.style.SUCCESS('新規通知対象はありません。'))
            return

        sent_count = 0
        for owner_id, items in activated_by_owner.items():
            room_ids = list(
                ChatworkRoom.objects.filter(owner_id=owner_id).values_list('room_id', flat=True)
            )
            if not room_ids and owner_id is not None:
                room_ids = list(
                    ChatworkRoom.objects.filter(owner__isnull=True).values_list('room_id', flat=True)
                )

            if not room_ids:
                self.stdout.write(
                    self.style.WARNING(f'owner={owner_id}: Chatwork room が未設定のため通知をスキップしました。')
                )
                continue

            message = self._build_message(items)
            if dry_run:
                self.stdout.write(self.style.WARNING(f'[dry-run] rooms={room_ids}\n{message}'))
                continue

            self._send_chatwork_message(room_ids, message)
            ReorderNotificationState.objects.filter(
                owner_id=owner_id,
                sku__in=[item['sku'] for item in items],
            ).update(last_notified_at=timezone.now())
            sent_count += len(items)

        if dry_run:
            self.stdout.write(self.style.SUCCESS('dry-run 完了'))
            return

        self.stdout.write(self.style.SUCCESS(f'Chatwork通知を送信しました。対象SKU数: {sent_count}'))

    def _get_latest_configs(self):
        latest_ids = SKUConfig.objects.filter(
            owner=OuterRef('owner'),
            sku=OuterRef('sku'),
        ).order_by('-data_month', '-updated_at').values('id')[:1]

        return (
            SKUConfig.objects
            .exclude(sku__in=RESERVED_SKUS)
            .filter(id__in=Subquery(latest_ids))
            .order_by('owner_id', 'sku')
        )

    def _group_by_owner_and_sku(self, latest_configs):
        grouped = defaultdict(list)
        for config in latest_configs:
            grouped[(config.owner_id, config.sku)].append(config)
        return grouped

    def _update_states(self, grouped_configs):
        activated_by_owner = defaultdict(list)

        with transaction.atomic():
            for (owner_id, sku), configs in grouped_configs.items():
                latest = configs[0]
                daily_sales = float(calculate_real_daily_sales_estimate(
                    SKUConfig.objects.filter(owner_id=owner_id, sku=sku),
                    latest.sales_price,
                ) or 0)
                secure_days = int(latest.secure_days or 0)
                delivery_days = int(latest.delivery_days or 0)
                current_inventory = int(latest.current_inventory or 0)

                delivery_point = round(daily_sales * secure_days)
                required_stock = round(daily_sales * delivery_days)
                recommended_delivery_quantity = max(required_stock - current_inventory, 0)
                is_alert = current_inventory < delivery_point and recommended_delivery_quantity > 0

                state, _ = ReorderNotificationState.objects.select_for_update().get_or_create(
                    owner_id=owner_id,
                    sku=sku,
                    defaults={
                        'is_active': False,
                    },
                )

                was_active = state.is_active
                state.is_active = is_alert
                state.current_inventory = current_inventory
                state.delivery_point = delivery_point
                state.recommended_delivery_quantity = recommended_delivery_quantity
                state.save()

                if is_alert and not was_active:
                    activated_by_owner[owner_id].append({
                        'sku': sku,
                        'product_name': latest.product_name or sku,
                        'current_inventory': current_inventory,
                        'delivery_point': delivery_point,
                        'recommended_delivery_quantity': recommended_delivery_quantity,
                        'daily_sales_estimate': round(daily_sales, 2),
                    })

        return activated_by_owner

    def _build_message(self, items):
        lines = [
            '[info][title]納品が必要な商品があります[/title]',
        ]
        for item in items:
            lines.append(
                (
                    f"SKU: {item['sku']}\n"
                    f"商品名: {item['product_name']}\n"
                    f"現在在庫: {item['current_inventory']}個\n"
                    f"納品点: {item['delivery_point']}個\n"
                    f"推奨納品数: {item['recommended_delivery_quantity']}個\n"
                    f"日次販売見込み: {item['daily_sales_estimate']}個/日"
                )
            )
            lines.append('---')
        if lines[-1] == '---':
            lines.pop()
        lines.append('[/info]')
        return '\n'.join(lines)

    def _send_chatwork_message(self, room_ids, message):
        for room_id in room_ids:
            response = requests.post(
                f'https://api.chatwork.com/v2/rooms/{room_id}/messages',
                headers={
                    'X-ChatWorkToken': settings.CHATWORK_API_TOKEN,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                data={'body': message},
                timeout=30,
            )
            response.raise_for_status()
