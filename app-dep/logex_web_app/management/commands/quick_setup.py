import os
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction
from logex_web_app.models import SKUConfig

class Command(BaseCommand):
    help = 'デモ用データの一括セットアップ（開発・テスト用）'

    def add_arguments(self, parser):
        parser.add_argument(
            '--preset',
            choices=['small', 'medium', 'large', 'realistic'],
            default='medium',
            help='データセットサイズ: small(5SKU×12ヶ月), medium(20SKU×36ヶ月), large(50SKU×36ヶ月), realistic(30SKU×36ヶ月リアル)'
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='既存データを削除してからセットアップ'
        )
        parser.add_argument(
            '--export-csv',
            action='store_true',
            help='生成データをCSVファイルにも出力'
        )

    def handle(self, *args, **kwargs):
        preset = kwargs['preset']
        clear_existing = kwargs['clear_existing']
        export_csv = kwargs['export_csv']

        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('🚀 SKU在庫管理システム デモデータセットアップ'))
        self.stdout.write(self.style.SUCCESS('=' * 60))

        # プリセット設定
        presets = {
            'small': {
                'sku_count': 5,
                'months': 12,
                'realistic': False,
                'description': '小規模テスト用 (5SKU × 12ヶ月 = 60レコード)'
            },
            'medium': {
                'sku_count': 20,
                'months': 36,
                'realistic': False,
                'description': '標準デモ用 (20SKU × 36ヶ月 = 720レコード)'
            },
            'large': {
                'sku_count': 50,
                'months': 36,
                'realistic': False,
                'description': '大規模テスト用 (50SKU × 36ヶ月 = 1,800レコード)'
            },
            'realistic': {
                'sku_count': 30,
                'months': 36,
                'realistic': True,
                'description': 'リアル商品データ (30SKU × 36ヶ月 = 1,080レコード)'
            }
        }

        config = presets[preset]
        self.stdout.write(f"📊 セットアップ内容: {config['description']}")
        
        if clear_existing:
            self.stdout.write(self.style.WARNING('⚠️  既存データを削除します...'))
            if self._confirm_deletion():
                self._clear_existing_data()
            else:
                self.stdout.write(self.style.ERROR('❌ セットアップを中止しました'))
                return

        # データ生成の実行
        self.stdout.write(self.style.SUCCESS('🔄 データ生成を開始します...'))
        
        try:
            with transaction.atomic():
                # メインの生成コマンドを実行
                call_command_args = [
                    'generate_sku_history',
                    '--sku-count', str(config['sku_count']),
                    '--months', str(config['months']),
                    '--mode', 'both' if export_csv else 'generate',
                ]
                
                if config['realistic']:
                    call_command_args.append('--realistic')
                
                if export_csv:
                    csv_filename = f"demo_data_{preset}_{config['sku_count']}sku_{config['months']}months.csv"
                    call_command_args.extend(['--csv-output', csv_filename])
                
                call_command(*call_command_args)
                
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'❌ データ生成でエラーが発生しました: {e}'))
            return

        # セットアップ完了の確認
        self._display_setup_summary(preset, config)
        self._display_usage_instructions()

    def _confirm_deletion(self):
        """削除確認"""
        existing_count = SKUConfig.objects.count()
        if existing_count == 0:
            self.stdout.write('既存データはありません。')
            return True
        
        self.stdout.write(f'現在 {existing_count} 件のSKU設定データが存在します。')
        response = input('本当に削除しますか？ (yes/no): ')
        return response.lower() in ['yes', 'y']

    def _clear_existing_data(self):
        """既存データの削除"""
        count = SKUConfig.objects.count()
        SKUConfig.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'✅ {count} 件のデータを削除しました'))

    def _display_setup_summary(self, preset, config):
        """セットアップサマリーの表示"""
        total_records = SKUConfig.objects.count()
        unique_skus = SKUConfig.objects.values('sku').distinct().count()
        latest_month = SKUConfig.objects.order_by('-data_month').first()
        oldest_month = SKUConfig.objects.order_by('data_month').first()
        
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('✅ セットアップ完了！'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f'📊 プリセット: {preset}')
        self.stdout.write(f'📈 総レコード数: {total_records:,} 件')
        self.stdout.write(f'🏷️  ユニークSKU数: {unique_skus} 件')
        
        if latest_month and oldest_month:
            self.stdout.write(f'📅 データ期間: {oldest_month.data_month} ～ {latest_month.data_month}')
        
        # サンプルデータの表示
        sample_skus = SKUConfig.objects.values('sku', 'product_name').distinct()[:5]
        self.stdout.write('\n📦 サンプルSKU:')
        for sku_data in sample_skus:
            self.stdout.write(f"  • {sku_data['sku']}: {sku_data['product_name']}")

    def _display_usage_instructions(self):
        """使用方法の説明"""
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('🎯 次のステップ'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('1. 開発サーバーを起動:')
        self.stdout.write('   python manage.py runserver')
        self.stdout.write('')
        self.stdout.write('2. ブラウザでアクセス:')
        self.stdout.write('   http://localhost:3000/products')
        self.stdout.write('')
        self.stdout.write('3. 機能テスト:')
        self.stdout.write('   • SKU検索・選択')
        self.stdout.write('   • 価格・在庫推移グラフ')
        self.stdout.write('   • 納品アラート機能')
        self.stdout.write('   • 設定の保存・更新')
        self.stdout.write('')
        self.stdout.write('4. 追加データが必要な場合:')
        self.stdout.write('   python manage.py quick_setup --preset=large')
        self.stdout.write('')
        self.stdout.write('5. データのクリア:')
        self.stdout.write('   python manage.py quick_setup --clear-existing --preset=small')

# 実行用のヘルパー関数
def generate_sample_data():
    """外部から呼び出し可能なサンプルデータ生成関数"""
    from django.core.management import call_command
    call_command('quick_setup', '--preset=medium')