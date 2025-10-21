import csv
import os
from datetime import datetime
from django.core.management.base import BaseCommand
from logex_web_app.models import SKUConfig
from decimal import Decimal

class Command(BaseCommand):
    help = 'CSVからSKUConfig情報をインポートします（時系列データ対応）'

    def add_arguments(self, parser):
        parser.add_argument(
            '--update-mode',
            choices=['latest', 'all'],
            default='latest',
            help='データ更新モード: latest（最新データのみ）または all（全履歴）'
        )

    def handle(self, *args, **kwargs):
        csv_path = os.path.join('logex_web_app', 'data', 'items.csv')
        if not os.path.exists(csv_path):
            self.stderr.write(self.style.ERROR(f'CSVファイルが見つかりません: {csv_path}'))
            return

        update_mode = kwargs['update_mode']
        
        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            created, updated, skipped = 0, 0, 0
            
            # CSVのヘッダー情報をログ出力
            headers = reader.fieldnames
            self.stdout.write(self.style.SUCCESS(f'CSVヘッダー: {headers}'))
            
            # 最初の数行をサンプル表示
            sample_count = 0
            for row in reader:
                if sample_count < 3:  # 最初の3行をサンプル表示
                    self.stdout.write(self.style.SUCCESS(f'サンプル行 {sample_count + 1}: {dict(row)}'))
                    sample_count += 1
                
                sku = row.get('出品者SKU')
                
                if not sku:
                    skipped += 1
                    continue
                
                # サンプル表示後は処理を中断
                if sample_count >= 3:
                    break
            
            # ファイルポインタをリセット
            csvfile.seek(0)
            reader = csv.DictReader(csvfile)
            
            # データ年月でグループ化し、最新データのみ処理する場合の処理
            if update_mode == 'latest':
                # SKUごとに最新のデータを保持する辞書
                latest_data = {}
                
                for row in reader:
                    sku = row.get('出品者SKU')
                    data_date = row.get('データ年月')
                    
                    if not sku:
                        continue
                    
                    # 現在の行が既存データより新しいかチェック
                    if sku not in latest_data or (data_date and str(data_date) > str(latest_data[sku].get('データ年月', ''))):
                        latest_data[sku] = row
                
                # 最新データのみを処理
                for sku, row in latest_data.items():
                    obj, is_created = self._create_or_update_sku(sku, row)
                    if is_created:
                        created += 1
                    else:
                        updated += 1
                        
            else:  # all モード：全履歴を処理（開発・分析用）
                for row in reader:
                    sku = row.get('出品者SKU')
                    data_date = row.get('データ年月')
                    
                    if not sku:
                        skipped += 1
                        continue
                    
                    # 履歴管理の場合、データ年月を含めた一意キーで管理
                    # （実際の運用では別テーブルでの履歴管理を推奨）
                    unique_key = f"{sku}_{data_date}" if data_date else sku
                    
                    obj, is_created = self._create_or_update_sku(sku, row, unique_key)
                    if is_created:
                        created += 1
                    else:
                        updated += 1

        self.stdout.write(self.style.SUCCESS(f'処理完了:'))
        self.stdout.write(self.style.SUCCESS(f'  - 新規作成: {created} 件'))
        self.stdout.write(self.style.SUCCESS(f'  - 更新: {updated} 件'))
        if skipped > 0:
            self.stdout.write(self.style.WARNING(f'  - スキップ: {skipped} 件'))

    def _create_or_update_sku(self, sku, row, unique_key=None):
        """SKU設定を作成または更新する"""
        # CSVフィールドの安全な取得とバリデーション
        product_name = row.get('商品名', '')
        sales_price = self._safe_decimal(row.get('販売価格'), 0)
        
        # 価格の範囲チェック（PostgreSQLのDecimal(10,2)制限: 最大99,999,999.99）
        max_decimal_value = Decimal('99999999.99')
        if sales_price > max_decimal_value:
            self.stderr.write(
                self.style.WARNING(f'販売価格が制限を超えています ({sales_price}) SKU: {sku}, 最大値に調整します')
            )
            sales_price = max_decimal_value
        
        defaults = {
            'product_name': product_name,
            'jan_code': '',  # SP-APIでは取得できないため空文字
            'supplier': '',  # SP-APIでは取得できないため空文字
            'secure_days': self._safe_int(row.get('在庫数'), 30),  # 在庫数をsecure_daysとして使用
            'delivery_days': 45,  # デフォルト値
            'purchase_price': Decimal('0'),  # SP-APIでは取得できないため0
            'sales_price': sales_price,
        }
        
        # データ年月の情報をログ出力（デバッグ用）
        data_date = row.get('データ年月', '')
        if data_date:
            self.stdout.write(
                self.style.SUCCESS(f'SKU {sku}: データ年月 {data_date}, 販売価格 ¥{sales_price:,} を処理中')
            )
        
        # 一意キーが指定されている場合はそれを使用、そうでなければSKUを使用
        lookup_field = unique_key if unique_key else sku
        
        try:
            obj, is_created = SKUConfig.objects.update_or_create(
                sku=lookup_field,
                defaults=defaults
            )
            return obj, is_created
        except Exception as e:
            self.stderr.write(
                self.style.ERROR(f'SKU {sku} の処理でエラー: {e}')
            )
            # エラー時はデフォルト値で再試行
            defaults['sales_price'] = Decimal('1000')  # 安全なデフォルト価格
            defaults['secure_days'] = 30
            obj, is_created = SKUConfig.objects.update_or_create(
                sku=lookup_field,
                defaults=defaults
            )
            return obj, is_created

    def _safe_int(self, value, default=0):
        """安全にintに変換する"""
        try:
            return int(value) if value else default
        except (ValueError, TypeError):
            return default

    def _safe_decimal(self, value, default=0):
        """安全にDecimalに変換する"""
        try:
            if not value:
                return Decimal(str(default))
            
            decimal_value = Decimal(str(value))
            
            # PostgreSQLのDecimal(10,2)制限チェック
            max_value = Decimal('99999999.99')
            if decimal_value > max_value:
                return max_value
            if decimal_value < Decimal('-99999999.99'):
                return Decimal('-99999999.99')
                
            return decimal_value
        except (ValueError, TypeError):
            return Decimal(str(default))