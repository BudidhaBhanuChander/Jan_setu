import requests

_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'

def encode_geohash(latitude: float, longitude: float, precision: int = 7) -> str:
    if latitude is None or longitude is None:
        return ''
    lat_interval = [-90.0, 90.0]
    lon_interval = [-180.0, 180.0]
    geohash = []
    bits = [16, 8, 4, 2, 1]
    bit = 0
    ch = 0
    even = True
    while len(geohash) < precision:
        if even:
            mid = (lon_interval[0] + lon_interval[1]) / 2
            if longitude > mid:
                ch |= bits[bit]
                lon_interval[0] = mid
            else:
                lon_interval[1] = mid
        else:
            mid = (lat_interval[0] + lat_interval[1]) / 2
            if latitude > mid:
                ch |= bits[bit]
                lat_interval[0] = mid
            else:
                lat_interval[1] = mid
        even = not even
        if bit < 4:
            bit += 1
        else:
            geohash.append(_BASE32[ch])
            bit = 0
            ch = 0
    return ''.join(geohash)

def geocode_address(query: str) -> dict:
    if not query or len(query.strip()) < 3:
        return {}
    url = 'https://nominatim.openstreetmap.org/search'
    params = {'q': query.strip() + ', Hyderabad, Telangana, India', 'format': 'json', 'limit': 1}
    headers = {'User-Agent': 'JanSetu-Municipal-AI/2.0'}
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=4)
        if resp.status_code == 200:
            data = resp.json()
            if data and len(data) > 0:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                return {'latitude': lat, 'longitude': lon, 'display_name': data[0].get('display_name', query), 'geohash': encode_geohash(lat, lon, precision=7)}
    except Exception as e:
        print('[GeoUtil] Error:', e)
    return {}
