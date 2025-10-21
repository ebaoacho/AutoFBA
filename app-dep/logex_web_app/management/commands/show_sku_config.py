import os
from django.core.management.base import BaseCommand
from logex_web_app.models import SKUConfig

class Command(BaseCommand):
    help = 'SKUConfigテーブルに格納されている現在のデータを表示します'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sku',
            type=str,
            help='特定のSKUのデータのみを表示（指定しない場合は全件表示）'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='表示する件数を制限'
        )

    def handle(self, *args, **kwargs):
        sku_filter = kwargs.get('sku')
        limit = kwargs.get('limit')
        
        # クエリセットの作成
        if sku_filter:
            queryset = SKUConfig.objects.filter(sku=sku_filter)
        else:
            queryset = SKUConfig.objects.all().order_by('sku')
        
        # 件数制限
        if limit:
            queryset = queryset[:limit]
        
        # データ件数の表示
        total_count = SKUConfig.objects.count()
        display_count = queryset.count()
        
        self.stdout.write(self.style.SUCCESS(f'\n=== SKUConfigテーブルの内容 ==='))
        self.stdout.write(self.style.SUCCESS(f'総レコード数: {total_count} 件'))
        self.stdout.write(self.style.SUCCESS(f'表示件数: {display_count} 件\n'))
        
        if display_count == 0:
            if sku_filter:
                self.stdout.write(self.style.WARNING(f'SKU "{sku_filter}" のデータが見つかりません'))
            else:
                self.stdout.write(self.style.WARNING('データが存在しません'))
            return
        
        # 各レコードの詳細表示
        for idx, config in enumerate(queryset, 1):
            self.stdout.write(self.style.SUCCESS(f'--- レコード {idx} ---'))
            self.stdout.write(f'  SKU: {config.sku}')
            self.stdout.write(f'  商品名: {config.product_name or "[未設定]"}')
            self.stdout.write(f'  JANコード: {config.jan_code or "[未設定]"}')
            self.stdout.write(f'  仕入先: {config.supplier or "[未設定]"}')
            
            # 金額フィールド
            self.stdout.write(f'  仕入価格: ¥{config.purchase_price:,.0f}' if config.purchase_price else '  仕入価格: [未設定]')
            self.stdout.write(f'  販売価格: ¥{config.sales_price:,.0f}' if config.sales_price else '  販売価格: [未設定]')
            
            # 日数設定
            self.stdout.write(f'  在庫確保日数: {config.secure_days} 日')
            self.stdout.write(f'  納品確保日数: {config.delivery_days} 日')
            
            # 手数料フィールド
            self.stdout.write(f'  Amazon販売手数料: ¥{config.amazon_fee:,.0f}' if config.amazon_fee else '  Amazon販売手数料: [未設定]')
            self.stdout.write(f'  送料: ¥{config.shipping_fee:,.0f}' if config.shipping_fee else '  送料: [未設定]')
            self.stdout.write(f'  倉庫保管料: ¥{config.storage_fee:,.0f}' if config.storage_fee else '  倉庫保管料: [未設定]')
            
            # 利益率
            self.stdout.write(f'  粗利: {config.profit_margin:.1f}%' if config.profit_margin else '  粗利: [未設定]')
            self.stdout.write(f'  最低許容粗利: {config.minimum_profit_margin:.1f}%' if config.minimum_profit_margin else '  最低許容粗利: [未設定]')
            
            # その他のフィールド
            self.stdout.write(f'  追跡対象: {"はい" if config.is_target else "いいえ"}')
            self.stdout.write(f'  作成日時: {config.created_at.strftime("%Y-%m-%d %H:%M:%S")}')
            self.stdout.write(f'  更新日時: {config.updated_at.strftime("%Y-%m-%d %H:%M:%S")}')
            
            # 計算値の表示（利益率が設定されていない場合の簡易計算）
            if config.sales_price and config.purchase_price and not config.profit_margin:
                simple_profit_margin = ((config.sales_price - config.purchase_price) / config.sales_price * 100)
                self.stdout.write(self.style.WARNING(f'  (参考)簡易利益率: {simple_profit_margin:.1f}%'))
            
            self.stdout.write('')  # 空行
        
        # サマリー情報
        self.stdout.write(self.style.SUCCESS('\n=== サマリー ==='))
        
        # 設定済み項目の統計
        with_jan = queryset.exclude(jan_code='').exclude(jan_code__isnull=True).count()
        with_supplier = queryset.exclude(supplier='').exclude(supplier__isnull=True).count()
        with_purchase_price = queryset.exclude(purchase_price__isnull=True).exclude(purchase_price=0).count()
        is_target_count = queryset.filter(is_target=True).count()
        
        self.stdout.write(f'JANコード設定済み: {with_jan} 件 ({with_jan/display_count*100:.1f}%)')
        self.stdout.write(f'仕入先設定済み: {with_supplier} 件 ({with_supplier/display_count*100:.1f}%)')
        self.stdout.write(f'仕入価格設定済み: {with_purchase_price} 件 ({with_purchase_price/display_count*100:.1f}%)')
        self.stdout.write(f'追跡対象商品: {is_target_count} 件 ({is_target_count/display_count*100:.1f}%)')