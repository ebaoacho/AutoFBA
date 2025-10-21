import random
import csv
import os
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User
from decimal import Decimal
from logex_web_app.models import SKUConfig
import math

class Command(BaseCommand):
    help = '3年間分のSKU履歴データを自動生成（仮ユーザ配下に登録）'

    def add_arguments(self, parser):
        parser.add_argument('--sku-count', type=int, default=20, help='生成するSKU数（デフォルト: 20）')
        parser.add_argument('--months', type=int, default=36, help='生成する月数（デフォルト: 36）')
        parser.add_argument('--mode', choices=['generate', 'csv', 'both'], default='both',
                            help='generate: DB生成, csv: CSV出力, both: 両方')
        parser.add_argument('--csv-output', type=str, default='generated_sku_data.csv', help='CSV出力ファイル名')
        parser.add_argument('--realistic', action='store_true', help='よりリアルな値（カテゴリ別レンジなど）')

    def handle(self, *args, **kwargs):
        sku_count = kwargs['sku_count']
        months = kwargs['months']
        mode = kwargs['mode']
        csv_output = kwargs['csv_output']
        realistic = kwargs['realistic']

        self.stdout.write(self.style.SUCCESS('=== 3年間履歴データ生成開始 ==='))
        self.stdout.write(self.style.SUCCESS(f'SKU数: {sku_count}, 期間: {months}ヶ月, モード: {mode}'))

        # ★ 仮ユーザの作成/取得（username=江畑尚, email=ebao@ebao.com）
        seed_user, u_created = User.objects.get_or_create(
            username='江畑尚',
            defaults={'email': 'ebao@ebao.com'}
        )
        # パスワードを常に設定（ズレていたら上書き）
        if (u_created) or (not seed_user.check_password('ebaoebao')):
            seed_user.set_password('ebaoebao')
            seed_user.save()
        self.stdout.write(self.style.SUCCESS(
            f'👤 仮ユーザ: username={seed_user.username}, email={seed_user.email}（新規作成: {u_created}）'
        ))

        # 商品マスタ生成
        products_data = self._generate_product_master(sku_count, realistic)
        # 履歴データ生成
        history_data = self._generate_history_data(products_data, months)

        if mode in ['csv', 'both']:
            self._export_to_csv(history_data, csv_output)

        if mode in ['generate', 'both']:
            self._import_to_database(history_data, owner=seed_user)

        self.stdout.write(self.style.SUCCESS('=== 処理完了 ==='))
        self.stdout.write(self.style.SUCCESS(f'総データ数: {len(history_data)}件'))

    # -----------------------
    # データ生成系
    # -----------------------
    def _generate_product_master(self, sku_count, realistic=False):
        self.stdout.write(self.style.SUCCESS('📦 商品マスタ生成中...'))
        if realistic:
            categories = {
                'electronics': {
                    'name_patterns': ['スマートフォンケース', 'ワイヤレスイヤホン', 'モバイルバッテリー', 'USB充電器', 'Bluetoothスピーカー'],
                    'price_range': (980, 15800),
                    'daily_sales_range': (2, 8),
                    'seasonal_factor': 1.2
                },
                'home': {
                    'name_patterns': ['キッチン用品', '収納ボックス', 'インテリア雑貨', '掃除用具', 'バス用品'],
                    'price_range': (580, 8900),
                    'daily_sales_range': (1, 5),
                    'seasonal_factor': 1.1
                },
                'fashion': {
                    'name_patterns': ['Tシャツ', 'パーカー', 'スニーカー', 'バッグ', 'アクセサリー'],
                    'price_range': (1280, 24800),
                    'daily_sales_range': (1, 6),
                    'seasonal_factor': 1.5
                },
                'health': {
                    'name_patterns': ['サプリメント', 'プロテイン', 'フィットネス用品', 'マッサージ器具', '健康グッズ'],
                    'price_range': (1980, 39800),
                    'daily_sales_range': (1, 4),
                    'seasonal_factor': 1.3
                },
                'books': {
                    'name_patterns': ['ビジネス書', '小説', '漫画', '参考書', '雑誌'],
                    'price_range': (480, 3980),
                    'daily_sales_range': (2, 10),
                    'seasonal_factor': 1.0
                }
            }
        else:
            categories = {
                'general': {
                    'name_patterns': ['商品A', '商品B', '商品C', '商品D', '商品E'],
                    'price_range': (500, 20000),
                    'daily_sales_range': (1, 8),
                    'seasonal_factor': 1.0
                }
            }

        products = []
        for i in range(sku_count):
            category_name = random.choice(list(categories.keys()))
            category = categories[category_name]
            sku = f"SKU-{category_name.upper()[:3]}-{i+1:04d}"

            base_name = random.choice(category['name_patterns'])
            if realistic:
                variants = ['Pro', 'Lite', 'Plus', 'Mini', 'Max', 'Standard', 'Premium', 'Basic']
                colors = ['ブラック', 'ホワイト', 'グレー', 'ブルー', 'レッド', 'ゴールド']
                product_name = f"{base_name} {random.choice(variants)} {random.choice(colors)}"
            else:
                product_name = f"{base_name}-{i+1:03d}"

            asin = f"B0{random.randint(10000000, 99999999)}"
            base_price = random.randint(*category['price_range'])
            daily_sales_base = random.uniform(*category['daily_sales_range'])
            supplier = random.choice(['株式会社サンプル商事', '有限会社テスト物産', '合同会社モック貿易', 'ダミー株式会社', 'サンプル合同会社']) if realistic else f"仕入先{i+1:03d}"
            jan_code = f"{random.randint(4900000000000, 4999999999999)}" if realistic else f"{random.randint(1000000000000, 9999999999999)}"

            products.append({
                'sku': sku,
                'product_name': product_name,
                'asin': asin,
                'category': category_name,
                'base_price': base_price,
                'daily_sales_base': daily_sales_base,
                'seasonal_factor': category['seasonal_factor'],
                'supplier': supplier,
                'jan_code': jan_code,
            })
            if (i + 1) % 5 == 0:
                self.stdout.write(f'  生成済み: {i+1}/{sku_count} SKU')
        return products

    def _generate_history_data(self, products, months):
        self.stdout.write(self.style.SUCCESS(f'📈 履歴データ生成中... ({months}ヶ月分)'))
        history_data = []
        base_date = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        total_records = len(products) * months
        current_record = 0

        for product in products:
            growth_trend = random.choice(['growing', 'declining', 'stable', 'seasonal'])
            trend_factor = self._get_trend_factor(growth_trend)
            inventory_strategy = random.choice(['aggressive', 'conservative', 'balanced'])

            for month_offset in range(months):
                current_date = base_date - timedelta(days=30 * month_offset)
                data_month = current_date.strftime('%Y-%m')
                month_variation = self._get_monthly_variation(current_date, product['seasonal_factor'])
                trend_effect = self._calculate_trend_effect(month_offset, months, trend_factor, growth_trend)

                price_variation = random.uniform(0.85, 1.15)
                sales_price = int(product['base_price'] * price_variation * trend_effect)
                daily_sales = max(0.1, product['daily_sales_base'] * month_variation * trend_effect)
                inventory = self._calculate_inventory(daily_sales, inventory_strategy, month_offset, months)
                purchase_price = int(sales_price * random.uniform(0.6, 0.8))

                amazon_fee = sales_price * 0.15 if sales_price > 0 else 0
                shipping_fee = random.randint(50, 300)
                storage_fee = random.randint(10, 100)

                profit_margin = sales_price - purchase_price - amazon_fee - shipping_fee - storage_fee

                history_data.append({
                    'sku': product['sku'],
                    'data_month': data_month,
                    'product_name': product['product_name'],
                    'asin': product['asin'],
                    'sales_price': sales_price,
                    'current_inventory': inventory,
                    'daily_sales_estimate': round(daily_sales, 2),
                    'purchase_price': purchase_price,
                    'jan_code': product['jan_code'],
                    'supplier': product['supplier'],
                    'amazon_fee': round(amazon_fee, 2),
                    'shipping_fee': shipping_fee,
                    'storage_fee': storage_fee,
                    'profit_margin': round(profit_margin, 2),
                    'is_target': random.choice([True, False]),
                    'secure_days': random.randint(20, 40),
                    'delivery_days': random.randint(35, 60),

                    # CSV用フィールド
                    '出品者SKU': product['sku'],
                    '商品名': product['product_name'],
                    'ASIN': product['asin'],
                    '販売価格': sales_price,
                    '在庫数': inventory,
                    'コンディション': '新品',
                    '商品タイプ': 'PRODUCT',
                    'データ年月': data_month,
                })
                current_record += 1
                if current_record % 100 == 0:
                    progress = (current_record / total_records) * 100
                    self.stdout.write(f'  進捗: {current_record}/{total_records} ({progress:.1f}%)')
        return history_data

    def _get_trend_factor(self, growth_trend):
        return {'growing': 1.5, 'declining': 0.7, 'stable': 1.0, 'seasonal': 1.2}[growth_trend]

    def _get_monthly_variation(self, date, seasonal_factor):
        month = date.month
        seasonal_multipliers = {1:0.8,2:0.9,3:1.1,4:1.0,5:0.9,6:1.0,7:1.1,8:1.2,9:1.0,10:1.1,11:1.3,12:1.4}
        base_seasonal = seasonal_multipliers[month]
        variation = base_seasonal * seasonal_factor if seasonal_factor > 1.0 else base_seasonal
        random_factor = random.uniform(0.9, 1.1)
        return variation * random_factor

    def _calculate_trend_effect(self, month_offset, total_months, trend_factor, growth_trend):
        progress = month_offset / total_months
        if growth_trend == 'growing':
            effect = 1.0 + (trend_factor - 1.0) * (1 - progress)
        elif growth_trend == 'declining':
            effect = trend_factor + (1.0 - trend_factor) * (1 - progress)
        elif growth_trend == 'seasonal':
            wave = math.sin(progress * math.pi * 4) * 0.3
            effect = 1.0 + wave
        else:
            effect = 1.0
        return max(0.1, effect)

    def _calculate_inventory(self, daily_sales, strategy, month_offset, total_months):
        monthly_sales = daily_sales * 30
        strategy_multipliers = {'aggressive': 1.5, 'conservative': 3.0, 'balanced': 2.0}
        base_inventory = monthly_sales * strategy_multipliers[strategy]
        depletion_factor = random.uniform(0.7, 1.3)
        if month_offset < 3:
            inventory = int(base_inventory * depletion_factor)
        else:
            inventory = int(base_inventory * random.uniform(0.5, 1.5))
        return max(0, inventory)

    def _export_to_csv(self, history_data, filename):
        self.stdout.write(self.style.SUCCESS(f'📄 CSV出力中: {filename}'))
        csv_fields = ['出品者SKU', '商品名', 'ASIN', '販売価格', '在庫数', 'コンディション', '商品タイプ', 'データ年月']
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=csv_fields)
            writer.writeheader()
            for record in history_data:
                writer.writerow({field: record[field] for field in csv_fields})
        self.stdout.write(self.style.SUCCESS(f'✅ CSV出力完了: {len(history_data)}件'))

    @transaction.atomic
    def _import_to_database(self, history_data, owner: User):
        """★ 仮ユーザ(owner)配下に登録する ★"""
        self.stdout.write(self.style.SUCCESS('💾 データベース登録中...（owner=仮ユーザ）'))
        created, updated = 0, 0

        for i, record in enumerate(history_data):
            try:
                obj, is_created = SKUConfig.objects.update_or_create(
                    owner=owner,                           # ★ ここで所有者をスコープ
                    sku=record['sku'],
                    data_month=record['data_month'],
                    defaults={
                        'product_name': record['product_name'],
                        'asin': record['asin'],
                        'sales_price': Decimal(str(record['sales_price'])),
                        'current_inventory': int(record['current_inventory']),
                        'daily_sales_estimate': Decimal(str(record['daily_sales_estimate'])),
                        'purchase_price': Decimal(str(record['purchase_price'])),
                        'jan_code': record['jan_code'],
                        'supplier': record['supplier'],
                        'amazon_fee': Decimal(str(record['amazon_fee'])),
                        'shipping_fee': Decimal(str(record['shipping_fee'])),
                        'storage_fee': Decimal(str(record['storage_fee'])),
                        'profit_margin': Decimal(str(record['profit_margin'])),
                        'is_target': bool(record['is_target']),
                        'secure_days': int(record['secure_days']),
                        'delivery_days': int(record['delivery_days']),
                    }
                )
                if is_created:
                    created += 1
                else:
                    updated += 1

                if (i + 1) % 100 == 0:
                    self.stdout.write(f'  登録済み: {i+1}/{len(history_data)}')

            except Exception as e:
                self.stderr.write(f'エラー: SKU {record.get("sku")} 月 {record.get("data_month")}: {e}')

        self.stdout.write(self.style.SUCCESS('✅ データベース登録完了'))
        self.stdout.write(self.style.SUCCESS(f'  新規作成: {created}件'))
        self.stdout.write(self.style.SUCCESS(f'  更新: {updated}件'))
