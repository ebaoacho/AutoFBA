import requests
from datetime import datetime
from dateutil import parser
import csv
from django.conf import settings
from django.utils import timezone
from django.db.models import OuterRef, Subquery, Max
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import ChatworkRoom, SKUConfig
from .serializers import SKUConfigSerializer, SKUConfigHistorySerializer, SKUConfigBulkUpdateSerializer, RegisterSerializer, UserSerializer

COOKIE_ACCESS = "access_token"
COOKIE_REFRESH = "refresh_token"

@api_view(['POST'])
def register_chatwork_room(request):
    room_id = request.data.get('room_id')
    if not room_id:
        return Response({'error': 'room_idが必要です'}, status=status.HTTP_400_BAD_REQUEST)

    room, created = ChatworkRoom.objects.get_or_create(room_id=room_id)
    if created:
        return Response({'success': True, 'message': f'Room ID {room_id} を新規登録しました'})
    else:
        return Response({'success': True, 'message': f'Room ID {room_id} はすでに登録済みです'})


@api_view(['POST'])
def send_chatwork_notification(request):
    message = request.data.get('message')
    if not message:
        return Response({'error': 'messageが必要です'}, status=status.HTTP_400_BAD_REQUEST)

    room_ids = ChatworkRoom.objects.values_list('room_id', flat=True)
    if not room_ids:
        return Response({'error': '登録されたルームIDが存在しません'}, status=status.HTTP_400_BAD_REQUEST)

    failed = []
    for room_id in room_ids:
        url = f'https://api.chatwork.com/v2/rooms/{room_id}/messages'
        headers = {
            'X-ChatWorkToken': settings.CHATWORK_API_TOKEN,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        data = {'body': message}
        res = requests.post(url, headers=headers, data=data)
        if res.status_code != 200:
            failed.append(room_id)

    if failed:
        return Response({'error': f'一部のルームへの送信に失敗しました: {failed}'}, status=207)

    return Response({'success': True})


@api_view(['POST'])
def sku_config_create(request):
    """新しいSKU設定を作成"""
    # 現在年月を自動設定
    if 'data_month' not in request.data:
        request.data['data_month'] = datetime.now().strftime('%Y-%m')
    
    serializer = SKUConfigSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(['GET'])
def sku_config_detail(request, sku):
    config = SKUConfig.objects.filter(sku=sku).order_by('-data_month').first()
    if not config:
        # デフォルトレスポンスを返す（空構造でOKなら）
        return Response({
            'sku': sku,
            'message': '設定が存在しません',
            'exists': False
        }, status=200)  # ← 404ではなく200
    serializer = SKUConfigSerializer(config)
    return Response(serializer.data)

@api_view(['GET'])
def all_sku_configs(request):
    include_history = request.GET.get('history', 'false').lower() == 'true'

    if include_history:
        configs = SKUConfig.objects.all().order_by('sku', '-data_month')
        serializer = SKUConfigSerializer(configs, many=True)
        return Response({
            'results': serializer.data,
            'total_count': len(serializer.data),
            'unique_skus': len(set(config.sku for config in configs)),
            'data_months': sorted(set(config.data_month for config in configs if config.data_month)),
            'include_history': True
        })
    else:
        # 🔽 最新の data_month を持つ SKU ごとの設定を抽出
        subquery = SKUConfig.objects.filter(
            sku=OuterRef('sku')
        ).order_by('-data_month').values('id')[:1]

        latest_configs = SKUConfig.objects.filter(id__in=Subquery(subquery))

        serializer = SKUConfigSerializer(latest_configs, many=True)
        return Response({
            'results': serializer.data,
            'total_count': len(serializer.data),
            'unique_skus': len(latest_configs),
            'include_history': False
        })
        
@api_view(['GET'])
def sku_config_history(request, sku):
    """特定SKUの履歴データを取得"""
    configs = SKUConfig.objects.filter(sku=sku).order_by('-data_month')
    if not configs.exists():
        return Response({'error': 'SKUが存在しません'}, status=404)
    
    # 軽量シリアライザーを使用（グラフ表示用）
    serializer = SKUConfigHistorySerializer(configs, many=True)
    
    return Response({
        'sku': sku,
        'history_count': len(serializer.data),
        'data_range': {
            'latest': configs.first().data_month if configs.exists() else None,
            'oldest': configs.last().data_month if configs.exists() else None
        },
        'history': serializer.data
    })


@api_view(['POST'])
def bulk_update_sku_data(request):
    """SP-APIデータの一括更新"""
    # バリデーション用シリアライザーを使用
    bulk_serializer = SKUConfigBulkUpdateSerializer(data=request.data)
    if not bulk_serializer.is_valid():
        return Response(bulk_serializer.errors, status=400)
    
    sp_api_data = bulk_serializer.validated_data.get('products', [])
    current_month = datetime.now().strftime('%Y-%m')
    
    updated_count = 0
    created_count = 0
    errors = []
    
    for product_data in sp_api_data:
        try:
            sku = product_data.get('seller_sku')
            if not sku:
                continue
                
            # 現在月のレコードを更新または作成
            config, created = SKUConfig.objects.update_or_create(
                sku=sku,
                data_month=current_month,
                defaults={
                    'product_name': product_data.get('product_name', ''),
                    'asin': product_data.get('asin', ''),
                    'sales_price': product_data.get('price', 0),
                    'current_inventory': product_data.get('quantity', 0),
                    'last_sales_sync': timezone.now(),
                    'daily_sales_estimate': calculate_real_daily_sales_estimate(product_data.get('price', 0)),
                    'other_fee': product_data.get('other_fee', 0),
                }
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
            
        except Exception as e:
            errors.append(f"SKU {sku}: {str(e)}")
    
    return Response({
        'success': True,
        'updated_count': updated_count,
        'created_count': created_count,
        'total_processed': updated_count + created_count,
        'errors': errors,
        'data_month': current_month
    })


def calculate_daily_sales_estimate(price):
    """価格に基づく日次販売推定数の計算"""
    if not price:
        return 1.0
    
    price = float(price)
    if price < 1000:
        return 5.0
    elif price < 3000:
        return 3.0
    elif price < 10000:
        return 2.0
    else:
        return 1.0

def calculate_real_daily_sales_estimate(configs, fallback_price=None):
    if configs.count() < 2:
        return calculate_daily_sales_estimate(fallback_price)

    sorted_configs = list(configs.order_by('-data_month'))
    latest = sorted_configs[0]
    prev = sorted_configs[1]

    try:
        date_latest = parser.parse(latest.data_month + "-01")
        date_prev = parser.parse(prev.data_month + "-01")
        delta_days = (date_latest - date_prev).days or 30
    except Exception:
        delta_days = 30

    delta_inventory = prev.current_inventory - latest.current_inventory
    if delta_days <= 0 or delta_inventory <= 0:
        return calculate_daily_sales_estimate(fallback_price or latest.sales_price)

    return round(delta_inventory / delta_days, 2)

@api_view(['GET'])
def sku_analytics(request, sku):
    """特定SKUの分析データを取得"""
    configs = SKUConfig.objects.filter(sku=sku).order_by('-data_month')
    if not configs.exists():
        return Response({'error': 'SKUが存在しません'}, status=404)
    
    latest_config = configs.first()
    real_daily_sales = calculate_real_daily_sales_estimate(configs)

    # 利益計算に使うコスト
    total_cost = float(latest_config.purchase_price or 0)
    if latest_config.other_fee:
        total_cost += float(latest_config.other_fee)
    
    sales_price = float(latest_config.sales_price or 0)

    # 利益率計算
    if sales_price > 0 and total_cost < sales_price:
        profit_rate = round((sales_price - total_cost) / sales_price * 100, 2)
    else:
        profit_rate = None

    # 日次利益計算
    if sales_price > total_cost and real_daily_sales > 0:
        daily_profit = round((sales_price - total_cost) * real_daily_sales, 2)
    else:
        daily_profit = None

    # 分析データの計算
    analytics_data = {
        'sku': sku,
        'latest_data_month': latest_config.data_month,
        'current_inventory': latest_config.current_inventory,
        'daily_sales_estimate': real_daily_sales,
        'delivery_point': round(real_daily_sales * latest_config.secure_days),
        'recommended_delivery_quantity': max(0, 
            round(real_daily_sales * latest_config.delivery_days) - latest_config.current_inventory
        ),
        'alert_triggered': latest_config.current_inventory < (real_daily_sales * latest_config.secure_days),
        'inventory_days': round(latest_config.current_inventory / real_daily_sales, 1) if real_daily_sales > 0 else 0,
        'history_count': configs.count(),
        'price_trend': calculate_price_trend(configs),
        'inventory_trend': calculate_inventory_trend(configs),
        'calculated_profit_rate': profit_rate,
        'calculated_daily_profit': daily_profit,
        'total_cost': round(total_cost, 2)
    }

    return Response(analytics_data)


def calculate_price_trend(configs):
    """価格トレンドの計算"""
    if configs.count() < 2:
        return 'insufficient_data'
    
    prices = [float(config.sales_price) for config in configs[:6] if config.sales_price is not None]
    if len(prices) < 2:
        return 'insufficient_data'
    
    recent_avg = sum(prices[:3]) / len(prices[:3]) if len(prices) >= 3 else prices[0]
    older_avg = sum(prices[3:]) / len(prices[3:]) if len(prices) > 3 else prices[-1]
    
    if recent_avg > older_avg * 1.05:
        return 'increasing'
    elif recent_avg < older_avg * 0.95:
        return 'decreasing'
    else:
        return 'stable'


def calculate_inventory_trend(configs):
    """在庫トレンドの計算"""
    if configs.count() < 2:
        return 'insufficient_data'
    
    inventories = [config.current_inventory for config in configs[:6] if config.current_inventory is not None]
    if len(inventories) < 2:
        return 'insufficient_data'
    
    recent_avg = sum(inventories[:3]) / len(inventories[:3]) if len(inventories) >= 3 else inventories[0]
    older_avg = sum(inventories[3:]) / len(inventories[3:]) if len(inventories) > 3 else inventories[-1]
    
    if recent_avg > older_avg * 1.1:
        return 'increasing'
    elif recent_avg < older_avg * 0.9:
        return 'decreasing'
    else:
        return 'stable'

@api_view(['GET'])
def export_all_sku_csv(request, format=None):
    """
    SKU設定のCSVエクスポート
    ?format=full → 全フィールド
    ?format=simplified（省略時含む）→ 指定カラム（6列）
    """
    export_format = request.GET.get('format', 'simplified').lower()
    today_str = datetime.now().strftime('%Y%m%d')

    configs = SKUConfig.objects.all().order_by('sku', '-data_month')
    if not configs.exists():
        return Response({'error': 'SKUConfigデータが存在しません'}, status=404)

    # ファイル名の設定
    filename = (
        f"sku_config_export_full_{today_str}.csv"
        if export_format == 'full'
        else f"sku_config_export_simplified_{today_str}.csv"
    )
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    writer = csv.writer(response)

    if export_format == 'full':
        serializer = SKUConfigSerializer(configs, many=True)
        serialized_data = serializer.data

        fieldnames = list(serialized_data[0].keys())
        writer.writerow(fieldnames)
        for row in serialized_data:
            writer.writerow([row.get(field, '') for field in fieldnames])

    else:
        headers = ['出品者SKU', 'FNSKU', 'ASIN', '商品名', 'JANコード', '納品数']
        writer.writerow(headers)
        for config in configs:
            writer.writerow([
                config.sku,
                getattr(config, 'fnsku', ''),  # 存在しない場合は空
                config.asin or '',
                config.product_name or '',
                config.jan_code or '',
                round(config.daily_sales_estimate * config.delivery_days) if config.daily_sales_estimate and config.delivery_days else 0
            ])

    return response

def _set_tokens(res: Response, user):
    refresh = RefreshToken.for_user(user)
    # 本番は HTTPS 前提（secure=True）
    res.set_cookie(COOKIE_ACCESS, str(refresh.access_token), httponly=True, secure=True, samesite="None", path="/", max_age=60*60)
    res.set_cookie(COOKIE_REFRESH, str(refresh),            httponly=True, secure=True, samesite="None", path="/", max_age=60*60*24*7)
    return res

@api_view(["POST"])
@permission_classes([AllowAny])
def auth_register(request):
    ser = RegisterSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=400)
    user = ser.save()
    res = Response(UserSerializer(user).data, status=201)
    return _set_tokens(res, user)

@api_view(["POST"])
@permission_classes([AllowAny])
def auth_login(request):
    email = (request.data.get("email") or "").lower()
    password = request.data.get("password") or ""
    user = authenticate(username=email, password=password)
    if user is None:
        return Response({"detail": "メールまたはパスワードが不正です。"}, status=400)
    res = Response(UserSerializer(user).data, status=200)
    return _set_tokens(res, user)

@api_view(["POST"])
def auth_logout(request):
    # refreshをブラックリストへ（任意）
    try:
        rt = request.COOKIES.get(COOKIE_REFRESH)
        if rt:
            RefreshToken(rt).blacklist()
    except Exception:
        pass
    res = Response({"ok": True}, status=200)
    res.delete_cookie(COOKIE_ACCESS, path="/")
    res.delete_cookie(COOKIE_REFRESH, path="/")
    return res

@api_view(["GET"])
def auth_me(request):
    return Response(UserSerializer(request.user).data, status=200)

@api_view(["GET"])
def health_check(request):
    return JsonResponse({'status': 'ok'}, status=200)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def spapi_connection_status(request):
    """
    ログインユーザーが SP-API のリフレッシュトークンを少なくとも1つ保持しているか？
    """
    has_token = SKUConfig.objects.filter(
        owner=request.user,
        refresh_token_enc__isnull=False
    ).exists()
    return Response({"has_refresh_token": has_token})