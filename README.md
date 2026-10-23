# Dưới Lớp Lông — Trại Sương

Luồng hiện tại nằm ở `src/game/GameApp.jsx` (entry `src/main.jsx`). HUD đã được rút gọn; hướng dẫn nằm trên tấm biển hai mặt ở cửa chuồng. Quầy chỉ mua/bán; sinh hoạt và chuyển buổi ở Tab hoặc giường, túi đồ I là lưới 24 ô. Búp bê cầu mưa đã loại bỏ; chỉ giữ búp bê cầu nắng. Tông đơ mới an toàn hai lần đầu, lần 3 có 20% nguy cơ hỏng, sau đó tăng 20 điểm phần trăm mỗi lần, tối đa 90%; thay chiếc mới sẽ đặt lại số lần dùng. Pin vẫn tiêu hao khi cạo.

Cừu mất 65 độ no mỗi sáng, gặm cỏ +4 mỗi giây khi mở cửa và trời khô, cỏ khô hồi cả đàn lên 100. Cần đạt 70 độ no khi bắt đầu đêm để có thu nhập. Mái không thay thế thức ăn ngày mưa.

HUD đếm toàn bộ đàn nhìn thấy ban đêm, gồm cả sói giả dạng; thu nhập và điều kiện thua vẫn tính cừu thật. Nhãn dùng #01, #02… cho mọi con, không dùng tên nội bộ của sói. Dấu hiệu giả dạng nhỏ hơn theo độ khó; mắt không tự phát sáng. Chế độ khó chỉ còn đầu móng/răng rất nhỏ và khác biệt thân gần như không thấy; trăng tròn vẫn giấu toàn bộ sơ hở. Điều khiển ưu tiên mã phím vật lý, giải phóng phím khi nhận sự kiện IME không rõ phím, xóa trạng thái giữ phím khi composition hoặc đổi cửa sổ.

Chiến đấu hiện dùng PvE 3D (`PveEngine.js`, `PveCombat.jsx`): WASD chạy, J đánh, K đỡ, Space né; kỹ năng sói có báo vùng nguy hiểm và nhịp ngẫu nhiên. Đỡ đúng lúc hoặc đánh trong cửa sổ hồi chiêu được phản đòn. Dễ: người chịu 70% sát thương, cừu miễn sát thương; thường: cừu 8 HP/đòn; khó: người chịu 150%, cừu 22 HP/đòn. Cừu có 100 HP, tụ vào hai góc và giữ HP sau trận. Shiba ngồi trước chuồng chó sát hàng rào, tự đánh phụ trong trận nếu sẵn sàng; H/E gọi kiểm tra chuồng khiến chó nghỉ hết đêm đó, sáng hôm sau hồi phục. Không có phí hồi chiêu khi chỉ tham chiến.

Shiba chỉ hỗ trợ khi người chơi vừa đánh và sói đang hồi chiêu: tối thiểu 7,5 giây giữa hai lần, 2 sát thương, không kết liễu; buff sát thương giảm còn 5%, vẫn đỡ một đòn. Sói tăng máu PvE và sát thương theo loài/số đêm. Áp lực tăng theo số đêm và thời gian giao chiến, giới hạn 5 đạn/quạt hoặc 3 vùng bẫy. Báo chiêu tối thiểu 0,85 giây (địa chấn 1,05), hồi chiêu tối thiểu 0,75 giây; kiểm tra vị trí an toàn có thể chạy tới sau 0,22 giây phản ứng trước khi thêm vùng nguy hiểm. Đường đạn được vẽ vàng trước khi phóng.

`dev/farm.html` và `dev/combat.html` là các màn thử độc lập, không đọc/ghi bản lưu người chơi. Các đoạn mô tả Canvas và búp bê cầu mưa ở phần lịch sử bên dưới đã được thay bằng luồng trên.

Game 3D hoạt hình góc nhìn thứ nhất bằng React, Three.js và Canvas. Mua trại kiếm tiền cưới vợ, điều tra sói ngụy trang và sống sót đến khi đủ **200 xu để bán trang trại**. Không còn giới hạn thắng sau 5 đêm.

Đồ họa mới: cừu có lông mềm, chớp mắt và cử động tai; chuồng có sàn ván, cửa sổ, xà gỗ và đèn lồng. Sân ngoài có đường đá, nhà nhỏ, giếng, luống rau và quầy hàng 3D. Ban ngày ra khỏi cửa chuồng, đến quầy bên phải và nhấn E để mua đồ; Tab vẫn mở quản lý trại. Các vật phẩm có hình minh họa riêng trong cửa hàng và túi đồ.

Khi phát hiện sói, trận đấu chuyển sang bối cảnh sân ngoài với sói 3D đúng loài, cử động khi tấn công/trúng đòn. Người chơi tiếp tục dùng Attack, Items, Call Dog và khung né đạn Canvas. Cảnh chuồng tạm ngừng render khi đang ở trận đấu để tránh chạy hai cảnh 3D cùng lúc.

## Chạy và kiểm tra

Chuồng hiện dùng chung một đàn, không chia A/B. Bản mới bắt đầu với rào tạm và sức chứa 8 cừu. Trong mục sinh hoạt, mỗi ngày chọn một việc xây dựng: gia cố rào (3 cấp), mở rộng chuồng (8 → 12 → 16 chỗ) hoặc lắp mái. Việc xây dựng tốn xu và không tự lặp mỗi lần bấm. Bản lưu cũ có đàn lớn giữ đủ sức chứa và chuyển cừu về chuồng chung.

Quầy nông trại bán cả đồ dùng lẫn trang bị mỗi ban ngày, không phụ thuộc thương nhân lang thang. Rìu thép tăng 35% sát thương nông cụ; súng săn cần mua để mở khóa, kèm 3 viên đạn; giáp nhẹ/nặng tăng 10%/20% sát thương khi còn độ bền. Giáp vỡ vẫn có thể sửa, sau đó nhận lại chỉ số tăng sát thương.

Vòng sinh hoạt mới: ban ngày mở cửa chuồng (E ở cửa hoặc Tab), đàn ra bãi phía tây; tưới rau ở góc tây nam luống rau hoặc trong bảng quản lý; cắt cỏ ở bãi phía tây (2 lần/ngày nắng, mỗi lần 2 bó, kho chứa 12 bó). Rau đủ 3 ngày được tưới sẽ thu hoạch bán 4 xu. Mưa tự tưới rau nhưng không phơi được cỏ. Búp bê cầu mưa/cầu nắng dùng trong túi đồ để chọn thời tiết sáng hôm sau.

Nhà phía tây nam có cửa mở và giường; E gần giường mở sinh hoạt/ngủ. Chọn ngủ và xác nhận để qua sáng hôm sau: sói vẫn ăn cừu, kể cả khi bỏ qua đêm từ ban ngày. Kho phía cạnh nhà có các bó cỏ hiển thị theo tồn kho. Quầy ở sân mở ban ngày; ban đêm người bán nghỉ và điểm E ghi rõ quầy đóng. Bản lưu cũ được bổ sung dụng cụ tông đơ và dữ liệu sinh hoạt, giữ nguyên tiền và đàn.

```sh
npm ci
npm run dev
npm run build
npm test
```

Game ở `http://127.0.0.1:3000/`. Nếu trình gọi npm trên Windows bị cấu hình sai, chạy trực tiếp sau khi đã cài thư viện:

```sh
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3000
node node_modules/vite/bin/vite.js build
node --test src/game/rules.test.js src/game/worldMath.test.js src/game/worldModels.test.js
```

## Điều khiển

- Chuột tự khóa khi vào chơi. Ctrl phải mở/khóa chuột; Ctrl trái không đổi chế độ. WASD đi lại, Shift đi nhanh, C cúi. Rê chuột để nhìn, không cần giữ kéo; Esc mở cài đặt (âm thanh, độ nhạy chuột). Nhấn Tiếp tục chơi để khóa lại chuột; E mở kiểm tra. Điện thoại dùng cụm mũi tên và kéo cảnh.
- F bật/tắt đèn pin. Hướng tâm ngắm vào con vật gần mình, **E** hoặc nút tương tác để xem tại chỗ. Ban ngày xem cừu miễn phí; ban đêm mới điều tra tốn năng lượng.
- Chọn mắt, chân, miệng, thân hoặc đuôi để camera tiến gần bộ phận đó. Kiểm tra tốn 1 trong 2 năng lượng. Cạo lông tốn 1 năng lượng và 1 pin tông đơ, giá 2 xu/pin. Esc đứng dậy.
- Attack/Space mở và chốt thanh đánh; nông cụ không hao tài nguyên, súng dùng đạn. Khi sói đánh, WASD/mũi tên di chuyển trái tim trong khung Canvas, hoặc kéo trực tiếp trên Canvas ở điện thoại.
- Items dùng thuốc/giáp sửa/buff, Call Dog chặn một đòn và tăng 20% sát thương nhưng làm chó kiệt sức đêm sau.

## Các luật Core GDD đã nối

- Cừu lớn: 1 xu/ngày; cừu con: 2 ngày lớn, chưa sinh tiền. Ngày mưa cần cỏ khô hoặc mái che để có thu nhập.
- Cửa hàng ban ngày có cỏ khô, pin, búp bê cầu nắng, hàng rào chia A/B, mái che và cừu giống. Thương nhân có NPC trong sân, có thể đến gần nhấn E để mở hàng; bán đạn, giáp, sửa giáp, bia và vật phẩm buff. Ngày đầu giới thiệu thương nhân, các sáng tiếp theo xuất hiện ngẫu nhiên 35%.
- Sáu loài: thường/dại từ đêm 1; con/gầy từ đêm 4; Alpha/trắng từ đêm 8. Móng, mắt/dãi, răng, sườn và bụng hiển thị trên mô hình. Chó không nhận ra sói con. Sói trắng ngụy trang hoàn hảo.
- Sói mạnh thêm mỗi 3 đêm, mỗi loài có 3 pattern Canvas riêng. Dại gây chảy máu, gầy né 30%, Alpha ăn 2 cừu, sói trắng che sương từ giữa ra ngoài. Gầy/con tích lũy 0,5 cừu mỗi đêm.
- Trăng tròn mỗi 7 đêm: mọi dấu hiệu bị ẩn, có tiếng hú; cạo lông vẫn xác định được sói.
- Sói bỏ sót ở lại và tiếp tục ăn cừu. Thua khi số sói **vượt** 50% cừu thật, khi hết cừu hoặc khi HP về 0. Đủ 200 xu phải bấm Bán trang trại vào ban ngày để thắng.
- Sổ tay chủ cũ có ngay từ đầu với toàn bộ loài/cơ chế. Thần Sói bằng sương hiện dần ở rìa rừng theo ngày sinh tồn.

## Kiến trúc và ví dụ dữ liệu

- [Core GDD, cấu trúc React, state và thuật toán](docs/CORE_GDD.md)
- [JSON Player, Sheep, Wolf, Inventory và một lượt chơi](docs/state-example.json)
- [Các prompt hình minh họa đã tạo](public/assets/art/PROMPTS.md)
- `/dev/combat.html`: kiểm thử Canvas từng loài trong môi trường phát triển, không đọc/ghi bản lưu người chơi.

Các phần chính chạy qua `src/game/rules.js`, `catalog.js`, `PhasePanels.jsx`, `FirstPersonScene.jsx` và `BulletCombat.jsx`. `src/canvas` chứa engine, pool đạn và pattern. Các màn hình cũ trong `src/components`, reducer/context cũ được giữ để tham khảo; không nằm trong luồng UI mới.

Bản lưu v3 dùng khóa `under-the-wool-v3`. Bản v2 được chuyển tiền, HP, ngày và đàn sang một buổi sáng áp dụng luật mới; khóa v2 vẫn giữ nguyên. Canvas đang bay và vị trí camera không lưu, còn HP/giáp/đạn/hỗ trợ chó được lưu. WebGL 2 cần được bật trong trình duyệt. Nếu không bắt được chuột, kéo chuột và mũi tên vẫn dùng được.
