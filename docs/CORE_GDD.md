# Core GDD — kiến trúc và dữ liệu đang chạy

## 1. Cấu trúc và các phase

```text
src/App.jsx                         điều phối phase, modal, lưu game
src/game/rules.js                   reducer thuần, kinh tế, ngày/đêm, thắng/thua
src/game/catalog.js                 Items, sáu loài Wolf, Spawner, tiến hóa, damage
src/game/PhasePanels.jsx            FarmDayPhase, NightInvestigation, túi đồ, sổ tay
src/game/FirstPersonScene.jsx        cảnh góc nhìn thứ nhất, chọn mục tiêu bằng E
src/game/worldModels.js             mô hình và manh mối 3D, thần sói, thương nhân
src/game/worldMath.js               va chạm, vùng tương tác, chuẩn hóa bàn phím
src/game/BulletCombat.jsx           CombatPhase: Attack / Items / Call Dog
src/canvas/CombatEngine.js          vòng Canvas bước cố định 60 Hz
src/canvas/BulletPool.js            tái sử dụng 200 viên đạn
src/canvas/PlayerHeart.js           di chuyển trái tim và giới hạn khung
src/canvas/patterns/AttackPatterns.js 18 pattern, ba pattern cho mỗi loại sói
dev/combat.html                    fixture QA độc lập, không đụng bản lưu
docs/state-example.json            ví dụ dữ liệu có thể serialize thành JSON
```

`useReducer(gameReducer)` là nguồn dữ liệu duy nhất cho luật chơi. React state cục bộ chỉ giữ góc nhìn giao diện, modal và nhịp thanh Attack; Three.js dùng ref cho camera, vị trí người chơi và mesh. Không đưa scene, mesh, DOM hoặc AudioContext vào bản lưu.

Luồng:

```text
day --NIGHT--> night --CHECK tìm đúng sói--> reveal --COMBAT--> combat
combat --WON_FIGHT--> night --DAWN--> day
day --SELL khi gold >= 200--> win
NIGHT / DAWN --wolfCount > sheepCount * 0.5--> lose
combat --HP bằng 0--> lose
```

Phase `day` chứa FarmDayPhase; `night` chứa NightInvestigation và điều tra tại chỗ; `combat` dùng CombatPhase Canvas. Phase `reveal` phát hoạt ảnh xé lông/hú, không tiêu thêm tài nguyên. Phím E chọn lại mục tiêu tại thời điểm nhấn, dùng khoảng cách tới bề mặt và vùng cơ thể thay vì đòi raycast đúng một pixel. Có kiểm tra đường nhìn để không tương tác xuyên tường/hàng rào.

## 2. Data model và backend

Các dữ liệu có thẩm quyền:

- `Player`: `id`, `hp`, `maxHp`, `energy`, `maxEnergy`, `weapon`, `ammo`, `armor`, `damageBuff`.
- `Armor`: `itemId`, `durability`, `maxDurability`.
- `Sheep`: `id`, `age` (`adult`/`baby`), `bornDay`, `penId`, `isSheared`.
- `Wolf`: `id` duy nhất, `type`, `invadedDay`, `penId`, `evolution`, `hp`, `speed`, `damage`, `disguise`, `tells`, `dogDetect`, `evasion`, `eatRate`, `eatenProgress`, `patternPool`, `specialMechanic`.
- `Inventory`: object `itemId -> số lượng nguyên`. `Items` là catalog tĩnh, chứa `id`, `price`, `shop`, mô tả và thuộc tính trang bị.
- `Farm`: `divided`, `roof`, `weather`, `fed`, `nextSunny`.
- `Dog`: `exhaustedThroughNight`, `lastScan`.
- `Combat`: `wolfHp`, `wolfMaxHp`, `dogUsed`, `shieldAvailable`, `bleedTurns`, `lastStrike`.

`flock` và `wolves` là hai tập thực thể riêng. `residents` là ảnh chụp dân cư ca đêm, trộn cừu thật và ngụy trang với nhãn ẩn danh để tên không tiết lộ sói. Sói bỏ sót tồn tại qua ngày. Các trường gốc `hp`, `sheep`, `energy`, `combatHp`, `fullMoon`, `deityStage` được `projection()` tính lại để giao diện đọc thuận tiện; backend chỉ cần giữ Player và các thực thể nguồn.

Ánh xạ backend sau này: bảng `players`, `sheep`, `wolves`, `inventory_stacks(player_id,item_id,quantity)`, `farm_runs`, `combat_sessions`. Dùng `type` để tham chiếu catalog loài và `itemId` để tham chiếu catalog vật phẩm. Các command phù hợp endpoint gồm `BUY`, `USE`, `NIGHT`, `CHECK`, `STRIKE`, `DAMAGE`, `DAWN`, `SELL`. Backend cần tự tính giá, RNG, HP, nguồn thu và tỉ lệ sói; không tin các bản sao UI hay sát thương do client tự gửi.

Lưu cục bộ: khóa `under-the-wool-v3`. Tải được bản v2 và chuyển tiền, HP, đàn cừu, ngày sang một buổi sáng theo GDD mới. Bản v2 vẫn nằm ở khóa cũ. Phiên bản mới không còn tự thắng sau 5 đêm. Vị trí camera và những viên đạn đang bay không được lưu; tải lại giữa combat sẽ trở về nhịp Attack, giữ HP/giáp/đạn và hỗ trợ chó đã dùng.

## 3. Kinh tế và sinh tồn

- Mỗi cừu lớn sống hết ngày tạo 1 xu, nếu đàn được ăn. Cừu con lớn khi `newDay - bornDay >= 2`, không tạo tiền sớm.
- Ngày nắng tự có cỏ. Ngày mưa, một bó cỏ khô nuôi cả đàn trong một ngày; mái che loại bỏ nhu cầu đó. Nếu thiếu thức ăn thì không có thu nhập ngày đó.
- Cạo lông tốn 1 năng lượng và 1 pin, giá pin 2 xu. Kiểm tra bộ phận khác tốn 1 năng lượng. Mỗi đêm khởi đầu có 2 năng lượng. Bia hồi 2, không vượt trần.
- Thương nhân có mặt ngày đầu để giới thiệu trang bị, sau đó mỗi sáng có xác suất 35%. Mưa có xác suất 25%. Búp bê đã dùng bảo đảm sáng tiếp theo nắng.
- Hàng rào chia A/B, đồng bộ vị trí con vật và cảnh 3D. Chó sủa khi vào chuồng có sói đánh hơi được; có thể yêu cầu kiểm tra lại. Sói con không tạo tín hiệu.
- Sói thường/dại/trắng ăn một cừu/đêm; gầy và con tích lũy 0,5 để hai đêm ăn một; Alpha ăn hai. Khi có chia chuồng, chúng chỉ ăn cừu cùng chuồng.
- Thắng chỉ qua command `SELL` vào ban ngày khi có ít nhất 200 xu. Sói phải **vượt** 50% cừu thật mới thua, bằng 50% vẫn chưa thua. HP hết hoặc đàn không còn cừu cũng kết thúc lượt.

## 4. Spawner và tiến hóa

`spawnWeights(day)` lọc theo các mốc:

| Ngày | Thường | Dại | Con | Gầy | Alpha | Trắng |
|---|---:|---:|---:|---:|---:|---:|
| 1–3 | 65 | 35 | 0 | 0 | 0 | 0 |
| 4–7 | 30 | 25 | 25 | 20 | 0 | 0 |
| 8+ | 20 | 20 | 15 | 15 | 18 | 12 |

Mỗi lần chọn: lấy `roll = random() * tổng trọng số`, trừ lần lượt cho đến khi `< 0`. Số sói mới:

```js
count = Math.min(
  1 + Math.floor(Math.max(0, day - 4) / 4),
  Math.max(1, Math.ceil(sheepCount * 0.3))
);
evolution = Math.floor((day - 1) / 3);
hp = baseHp + evolution * (type === 'alpha' ? 8 : 4);
speed = baseSpeed * (1 + evolution * 0.1);
```

Không có cừu thì không spawn. Sói cũ vẫn có mặt, được áp dụng tiến hóa của đêm hiện tại. Mỗi đêm 7, 14, 21… đặt `tells=[]`, `tell=null`, `hidden=true`. Mô hình không hiện móng, mắt đỏ, răng, sườn hay bụng khác lạ khi hidden. Cạo lông luôn xác định sói, kể cả sói trắng và trăng tròn. Hình bóng thần sói tăng theo `clamp((day-1)/14, 0, 1)` ở rìa rừng.

## 5. Canvas combat và độ bền giáp

Canvas có tọa độ 400×400, khung chiến đấu vuông 280×280. `CombatEngine` dùng accumulator bước `1000/60 ms` để đạn không nhanh hơn trên màn 144 Hz. Mỗi lượt né dài 360 bước sau 24 bước chuẩn bị; random một pattern trong pool của loài khi bắt đầu lượt. Dừng chạy khi tab bị ẩn; dọn RAF/listener khi rời combat.

```js
pattern = getRandomPattern(wolf.patternPool);
pattern(bulletPool, frame, BATTLE_BOX, wolf.speed);
bulletPool.update(fixedDt, BATTLE_BOX);
heart.update(fixedDt);
if (bulletPool.checkCollision(heart).length && cooldownExpired) {
  dispatch({ type: 'DAMAGE', amount: wolf.damage, bleed: isBleed });
}
```

`absorbDamage()` dùng bản sao dữ liệu, không sửa Player cũ:

```js
absorbed = Math.min(player.armor?.durability || 0, incoming);
newDurability = oldDurability - absorbed;
newHp = Math.max(0, oldHp - (incoming - absorbed));
```

Chó chặn một đòn trước bước trừ giáp, tăng 20% sát thương trận hiện tại; `exhaustedThroughNight = day+1` nên đêm sau không giúp tìm sói. Đòn sói dại xuyên qua giáp gây chảy máu 3 lượt, mỗi lượt mất 2 HP. Sói trắng vẽ lớp sương trắng từ tâm ra ngoài sau khi đã vẽ đạn và trái tim. Pool gầy có 30% né được đòn Attack. Súng sát thương cao và vùng Critical rộng hơn nông cụ; phát bị né vẫn tốn đạn.

## 6. Kiểm chứng

`npm test`: luật GDD, điều kiện bán trại, ngưỡng 50%, trưởng thành, mưa/thức ăn, cooldown chó, giáp, đạn, trăng tròn, bảng spawn, 18 pattern và giới hạn va chạm/tương tác E. Mô hình 3D có kiểm tra geometry riêng. `dev/combat.html` cho phép thử từng loài bằng chính CombatPhase, không đọc/ghi localStorage.
