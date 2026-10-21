# Dưới Lớp Lông — Trại Sương

Game 3D hoạt hình góc nhìn thứ nhất bằng React, Three.js và Canvas. Mua trại kiếm tiền cưới vợ, điều tra sói ngụy trang và sống sót đến khi đủ **200 xu để bán trang trại**. Không còn giới hạn thắng sau 5 đêm.

## Chạy và kiểm tra

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
