# Araç Ekleme Boru Hattı

Yeni araç eklerken bu adımları sırayla uygula. Sebepleri değiştirme gerekçesiyle birlikte
yazıldı; adım atlama.

## 1. Kaynak → GLB export

`.blend` dosyası `assets/source/` altına konur (217MB+ olabilir, **git'e commit edilmez**).

```bash
blender -b assets/source/<arac>.blend --python-expr "
import bpy
bpy.ops.export_scene.gltf(filepath='/tmp/<arac>-src.glb', export_format='GLB', use_visible=True)
"
```

## 2. Car-paint node renklerini GLB'ye işle (KRİTİK)

Blender'ın `metallic_carpaint` node group'ları glTF'e çevrilemez → kaporta beyaz,
metallic/roughness default'a düşer. Renkler node group'un `color` inputundan okunur:

```bash
blender -b assets/source/<arac>.blend --python-expr "
import bpy, json
out = {}
for mat in bpy.data.materials:
    if not mat.node_tree: continue
    for node in mat.node_tree.nodes:
        if node.type != 'GROUP' or 'carpaint' not in (node.node_tree.name if node.node_tree else ''): continue
        vals = {}
        for inp in node.inputs:
            if inp.is_linked: continue
            try:
                if inp.type == 'RGBA': vals[inp.name.lower()] = [round(x,4) for x in inp.default_value]
                elif inp.type == 'VALUE': vals[inp.name.lower()] = round(float(inp.default_value),4)
            except: pass
        out[mat.name] = vals
        break
print('JSON-START'); print(json.dumps(out)); print('JSON-END')
"
```

Çıkan JSON ile GLB materyalleri patch edilir (her carpaint materyaline):
- `baseColorFactor` = `color` (linear, olduğu gibi)
- `metallicFactor` = 1.0
- `roughnessFactor` = `flakes roughness`
- `KHR_materials_clearcoat`: `clearcoatFactor: 1`, `clearcoatRoughnessFactor` = `clearcoat roughness`

(Patch scripti: GLB json chunk'ı aç, materyalleri düzenle, 4-byte hizalı geri yaz —
mercedes için kullanılan script bu repo geçmişinde, gerekirse aynısı uyarlanır.)

## 3. Optimize — simplify/weld YASAK

```bash
npx @gltf-transform/cli optimize /tmp/<arac>-colored.glb public/models/<arac>.opt.glb \
  --no-palette --no-simplify --no-weld --no-instance \
  --compress meshopt --texture-compress webp --texture-size 2048
```

- `--no-simplify --no-weld`: decimation/weld kaporta normallerini bozup parlak boyada
  **leke/dalgalanma** yaratıyor (mercedes'te yaşandı). Sahne unlit + demand olduğu için
  2M üçgen sorun değil.
- `--no-palette`: palet dokusu renk hatalarına açık; materyal factor'ları korunur.
- `--no-instance`: EXT_mesh_gpu_instancing, auto-fit'in bbox hesabını ve clone'u bozuyor;
  kapalı kalmalı.
- Skinned (kemikli) modeller: `vehicle.tsx` bu yüzden `SkeletonUtils.clone` kullanır —
  düz `scene.clone(true)` skinned parçaları orijinal iskelete bağlı bırakıp odaya saçar
  (rolls-royce'ta tekerlekler böyle dağıldı). Bu davranışı değiştirme.
- `join` otomatik çalışır → drawcall'u düşürür (mercedes: 419 → 73).

## 4. vehicles.ts kaydı

`src/data/vehicles.ts` → `VEHICLES` dizisine ekle:

```ts
{
  id: "arac-id",
  name: "Görünen Ad",
  tagline: "...",
  model: "/models/<arac>.opt.glb",
  stage: { length: 4.9, rotationY: Math.PI - 0.55 },  // uzunluk metre; açı: burnu kameraya
  // paint: { material: "Carpaint", color: "#..." },  // opsiyonel renk override
  camera: { pos: [0.5, 1.25, -8.6], target: [0, 0.85, 0.4] },  // araç-lokal koordinat
  hotspots: [...],
}
```

- **Auto-fit**: `vehicle.tsx` modeli otomatik ölçekler (uzunluk `stage.length`),
  tabanı zemine, merkezi sahneye oturtur; uzunluk x eknindeyse 90° otomatik döner.
  Ters bakıyorsa `rotationY`'ye `Math.PI` ekle.
- **Hotspot koordinatı**: dev modunda araca tıkla → console'a araç-lokal
  `hotspot position: [x, y, z]` yazar, aynen kopyala.

## 5. Materyal düzeltmeleri otomatik (isimlendirmeye dikkat)

`vehicle.tsx` yüklerken şunları kendisi yapar — modeldeki materyal İSİMLERİ bu
tabloyla eşleşmeli (Blender'da isimlendirirken buna uy):

| İsim | Davranış |
|---|---|
| `Headlight glass` | şeffaf cam (opak export edilir, düzeltilir) |
| `Red glass`, `Taillight Ridges` | yarı şeffaf kırmızı + iç kızıllık; transmission kapatılır |
| `Glass`, `Rear glass` | pencere camı parlaklık/yansıma |
| `Carpaint` | metalness 0.9'a kırpılır |
| (hepsi) | emissiveIntensity ≤ 3 (far/stop 20000 gibi değerlerle gelir, bloom'u patlatır), specularColor ≤ 1, envMapIntensity 0.9 |

Materyaller instance başına klonlanır; araç değişince klonlar dispose edilir,
useGLTF cache'i korunur.

Modelde bozuk export edilmiş malzeme değeri varsa (ör. ranger'da lastik
`metalness: 0.84` geldi → gri/silik göründü) `vehicles.ts` kaydına
`materialOverrides: { <malzemeAdı>: { metalness, roughness, envMapIntensity, color, opacity } }`
ekle — traverse sırasında otomatik uygulanır.

## 6. Performans kuralları (60fps sözleşmesi)

- Hotspot işaretçilerinde `<Html occlude>` KULLANMA — her kare tüm sahneye CPU
  raycast atar (mercedes'te "dehşet kasma"nın sebebiydi).
- Canvas `frameloop="demand"` — yeni animasyon eklersen `invalidate()` çağır
  (gsap `onUpdate` içinde; örnek: `camera-controller.tsx`).
- Garaj unlit'tir (MeshBasic + baked AO); sahneye real-time ışık ekleme, araç
  yalnız `<Environment>` IBL ile aydınlanır.
- Kontrol: dev'de StatsGl (fps) + console `[perf] drawcalls/tris` logu.
