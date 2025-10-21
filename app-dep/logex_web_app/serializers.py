from rest_framework import serializers
from .models import SKUConfig
from django.contrib.auth.models import User
from rest_framework import serializers

class SKUConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SKUConfig
        fields = [
            'sku',
            'data_month',
            'product_name',
            'jan_code',
            'supplier',
            'purchase_price',
            'sales_price',
            'secure_days',
            'delivery_days',
            'amazon_fee',
            'shipping_fee',
            'storage_fee',
            'other_fee',
            'profit_margin',
            'minimum_profit_margin',
            'is_target',
            'current_inventory',
            'asin',
            'last_sales_sync',
            'daily_sales_estimate',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    # バリデーション強化
    def validate_purchase_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("仕入価格は0以上である必要があります")
        return value

    def validate_sales_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("販売価格は0以上である必要があります")
        return value

    def validate_current_inventory(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("在庫数は0以上である必要があります")
        return value

    def validate_daily_sales_estimate(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("日次販売推定数は0以上である必要があります")
        return value

    def validate_secure_days(self, value):
        if value is not None and (value < 1 or value > 365):
            raise serializers.ValidationError("在庫確保日数は1日から365日の間で設定してください")
        return value

    def validate_delivery_days(self, value):
        if value is not None and (value < 1 or value > 365):
            raise serializers.ValidationError("納品確保日数は1日から365日の間で設定してください")
        return value

    def validate_data_month(self, value):
        if value:
            import re
            if not re.match(r'^\d{4}-\d{2}$', value):
                raise serializers.ValidationError("データ年月はYYYY-MM形式で入力してください")
        return value

    def validate_jan_code(self, value):
        if value:
            # JANコードは8桁または13桁の数字
            if not value.isdigit() or len(value) not in [8, 13]:
                raise serializers.ValidationError("JANコードは8桁または13桁の数字で入力してください")
        return value

    def validate_asin(self, value):
        if value:
            import re
            # ASINは10桁の英数字（通常はB0から始まる）
            if not re.match(r'^[A-Z0-9]{10}$', value):
                raise serializers.ValidationError("ASINは10桁の英数字で入力してください")
        return value

    # カスタムフィールドの計算
    def validate(self, data):
        """複数フィールドにまたがるバリデーション"""
        # 利益計算の整合性チェック
        purchase_price = data.get('purchase_price')
        sales_price = data.get('sales_price')
        
        if purchase_price and sales_price and purchase_price > sales_price:
            raise serializers.ValidationError(
                "仕入価格が販売価格を上回っています。利益がマイナスになります。"
            )
        
        # 納品確保日数は在庫確保日数以上であるべき
        secure_days = data.get('secure_days')
        delivery_days = data.get('delivery_days')
        
        if secure_days and delivery_days and delivery_days < secure_days:
            raise serializers.ValidationError(
                "納品確保日数は在庫確保日数以上に設定してください。"
            )
        
        return data

    def to_representation(self, instance):
        """シリアライズ時のカスタム表現"""
        data = super().to_representation(instance)

        # 利益率の自動計算
        if instance.purchase_price is not None and instance.sales_price and instance.sales_price > 0:
            total_cost = float(instance.purchase_price)
            if instance.other_fee:
                total_cost += float(instance.other_fee)

            profit_rate = ((float(instance.sales_price) - total_cost) /
                        float(instance.sales_price) * 100)
            data['calculated_profit_rate'] = round(profit_rate, 2)
        else:
            data['calculated_profit_rate'] = None

        # 日次予想利益の計算
        if (instance.purchase_price is not None and instance.sales_price and
            instance.daily_sales_estimate and instance.sales_price > instance.purchase_price):
            total_cost = float(instance.purchase_price)
            if instance.other_fee:
                total_cost += float(instance.other_fee)

            daily_profit = ((float(instance.sales_price) - total_cost) *
                            float(instance.daily_sales_estimate))
            data['calculated_daily_profit'] = round(daily_profit, 2)
        else:
            data['calculated_daily_profit'] = None

        # 在庫日数の計算
        if instance.current_inventory and instance.daily_sales_estimate and instance.daily_sales_estimate > 0:
            inventory_days = float(instance.current_inventory) / float(instance.daily_sales_estimate)
            data['calculated_inventory_days'] = round(inventory_days, 1)
        else:
            data['calculated_inventory_days'] = None

        # アラート状態の判定
        if (instance.current_inventory is not None and instance.daily_sales_estimate and
            instance.secure_days and instance.daily_sales_estimate > 0):
            delivery_point = float(instance.daily_sales_estimate) * instance.secure_days
            data['alert_triggered'] = instance.current_inventory < delivery_point
            data['delivery_point'] = round(delivery_point, 0)
        else:
            data['alert_triggered'] = False
            data['delivery_point'] = None

        return data

# 履歴データ用の軽量シリアライザー（グラフ表示用）
class SKUConfigHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SKUConfig
        fields = [
            'sku',
            'data_month',
            'sales_price',
            'current_inventory',
            'daily_sales_estimate',
            'updated_at'
        ]

# 一括更新用のシリアライザー
class SKUConfigBulkUpdateSerializer(serializers.Serializer):
    products = serializers.ListField(
        child=serializers.DictField(),
        help_text="SP-APIから取得した商品データのリスト"
    )
    
    def validate_products(self, value):
        required_fields = ['seller_sku']
        for product in value:
            for field in required_fields:
                if field not in product:
                    raise serializers.ValidationError(f"各商品データには{field}が必要です")
        return value
    
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name"]  # first_nameをニックネーム用途に

class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    nickname = serializers.CharField(max_length=150)

    def validate_email(self, value):
        if User.objects.filter(username=value.lower()).exists():
            raise serializers.ValidationError("このメールアドレスは既に登録されています。")
        return value

    def create(self, validated_data):
        email = validated_data["email"].lower()
        password = validated_data["password"]
        nickname = validated_data["nickname"].strip()

        user = User.objects.create_user(
            username=email,   # username=メールで統一
            email=email
        )
        user.first_name = nickname
        user.set_password(password)   # ★★ ハッシュ化 ★★
        user.save()
        return user