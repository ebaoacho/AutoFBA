# models.py
from django.db import models
from django.contrib.auth.models import User
from core.utils.encryption import encrypt_str, decrypt_str

class ChatworkRoom(models.Model):
    owner = models.ForeignKey(User, related_name='chatwork_rooms', on_delete=models.CASCADE, null=True, blank=True)
    room_id = models.CharField(max_length=20, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return self.room_id

class SKUConfig(models.Model):
    owner = models.ForeignKey(User, related_name='sku_configs', on_delete=models.CASCADE, null=True, blank=True)

    sku = models.CharField(max_length=30, db_index=True)
    data_month = models.CharField(max_length=7)
    product_name = models.CharField(max_length=255, blank=True, null=True)
    jan_code = models.CharField(max_length=13, blank=True, null=True)
    supplier = models.CharField(max_length=100, blank=True, null=True)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    sales_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    secure_days = models.IntegerField(default=30)
    delivery_days = models.IntegerField(default=45)

    amazon_fee = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    storage_fee = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    other_fee = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    profit_margin = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    minimum_profit_margin = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    is_target = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    current_inventory = models.IntegerField(default=0)
    asin = models.CharField(max_length=10, blank=True, null=True)
    
    last_sales_sync = models.DateTimeField(blank=True, null=True)
    daily_sales_estimate = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)

    # 暗号化保存用フィールド（平文は絶対に保存しない）
    refresh_token_enc = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ['sku', 'data_month']
        ordering = ['sku', '-data_month']
        # （任意だが推奨）検索最適化
        indexes = [
            models.Index(fields=['owner', 'sku', 'data_month']),
        ]

    def __str__(self):
        return f"{self.sku} - {self.data_month} - {self.product_name or ''}"

    # ====== ここから便利メソッド（平文は入出力時のみ扱う） ======

    def set_refresh_token(self, plaintext: str | None):
        """
        平文のリフレッシュトークンを受け取り、暗号化して保存用フィールドにセット。
        None または空を渡すと削除する。
        """
        self.refresh_token_enc = encrypt_str(plaintext) if plaintext else None

    def get_refresh_token(self) -> str | None:
        """
        復号して平文のリフレッシュトークンを返す（内部利用専用）。
        復号に失敗した場合は None。
        """
        return decrypt_str(self.refresh_token_enc)

    @property
    def has_refresh_token(self) -> bool:
        """管理画面やAPIで“設定済みかどうか”だけを示したい時に使う。"""
        return bool(self.refresh_token_enc)
