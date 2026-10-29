# Dưới Lớp Lông — Trại Sương

Luồng hiện tại nằm ở `src/game/GameApp.jsx` (entry `src/main.jsx`). HUD đã được rút gọn; hướng dẫn nằm trên tấm biển hai mặt ở cửa chuồng. Quầy chỉ mua/bán; sinh hoạt và chuyển buổi ở Tab hoặc giường, túi đồ I là lưới 24 ô. Búp bê cầu mưa đã loại bỏ; chỉ giữ búp bê cầu nắng. Tông đơ mới an toàn hai lần đầu, lần 3 có 20% nguy cơ hỏng, sau đó tăng 20 điểm phần trăm mỗi lần, tối đa 90%; thay chiếc mới sẽ đặt lại số lần dùng. Pin vẫn tiêu hao khi cạo.

Cừu mất 65 độ no mỗi sáng, gặm cỏ +4 mỗi giây khi mở cửa và trời khô, cỏ khô hồi cả đàn lên 100. Cần đạt 70 độ no khi bắt đầu đêm để có thu nhập. Mái không thay thế thức ăn ngày mưa.

Cỏ dự trữ được thu hoạch trực tiếp ở bãi riêng phía đông: người chơi phải đi vào từng luống rồi nhấn E, không cắt từ menu. Mỗi luống cho 2 bó, tối đa 2 luống/ngày nắng, mọc lại sáng hôm sau; kho chứa 12 bó. Thời tiết có 25% khả năng mưa mỗi ngày, kể cả sau một ngày mưa, không tăng dồn; búp bê cầu nắng vẫn bảo đảm nắng sáng hôm sau.

HUD đếm toàn bộ đàn nhìn thấy ban đêm, gồm cả sói giả dạng; thu nhập và điều kiện thua vẫn tính cừu thật. Nhãn dùng #01, #02… cho mọi con, không dùng tên nội bộ của sói. Dấu hiệu giả dạng nhỏ hơn theo độ khó; mắt không tự phát sáng. Chế độ khó chỉ còn đầu móng/răng rất nhỏ và khác biệt thân gần như không thấy; trăng tròn vẫn giấu toàn bộ sơ hở. Điều khiển ưu tiên mã phím vật lý, giải phóng phím khi nhận sự kiện IME không rõ phím, xóa trạng thái giữ phím khi composition hoặc đổi cửa sổ.

Chiến đấu hiện dùng PvE 3D (`PveEngine.js`, `PveCombat.jsx`): WASD chạy, J đánh, K đỡ, Space né; kỹ năng sói có báo vùng nguy hiểm và nhịp ngẫu nhiên. Đỡ đúng lúc hoặc đánh trong cửa sổ hồi chiêu được phản đòn. Dễ: người chịu 70% sát thương, cừu miễn sát thương; thường: cừu 8 HP/đòn; khó: người chịu 150%, cừu 22 HP/đòn. Cừu có 100 HP, tụ vào hai góc và giữ HP sau trận. Shiba ngồi trước chuồng chó sát hàng rào, tự đánh phụ trong trận nếu sẵn sàng; H/E gọi kiểm tra chuồng khiến chó nghỉ hết đêm đó, sáng hôm sau hồi phục. Không có phí hồi chiêu khi chỉ tham chiến.

Hoạt ảnh sói tách trạng thái đứng, di chuyển, lấy đà, tung chiêu, hồi sức và trúng đòn; nhịp cơ thể, đầu, tai, chân và đuôi thay đổi theo hành động. Biến đổi hoạt ảnh dựa trên tư thế gốc của mô hình để tránh cộng dồn tỉ lệ khiến sói co nhỏ hoặc biến mất.

Shiba chỉ hỗ trợ khi người chơi vừa đánh và sói đang hồi chiêu: tối thiểu 7,5 giây giữa hai lần, 2 sát thương, không kết liễu; buff sát thương giảm còn 5%, vẫn đỡ một đòn. Sói tăng máu PvE và sát thương theo loài/số đêm. Áp lực tăng theo số đêm và thời gian giao chiến, giới hạn 5 đạn/quạt hoặc 3 vùng bẫy. Báo chiêu tối thiểu 0,85 giây (địa chấn 1,05), hồi chiêu tối thiểu 0,75 giây; kiểm tra vị trí an toàn có thể chạy tới sau 0,22 giây phản ứng trước khi thêm vùng nguy hiểm. Đường đạn được vẽ vàng trước khi phóng.

`dev/farm.html` và `dev/combat.html` là các màn thử độc lập, không đọc/ghi bản lưu người chơi.

Game 3D hoạt hình góc nhìn thứ nhất bằng React, Three.js và Canvas. Mua trại kiếm tiền cưới vợ, điều tra sói ngụy trang và sống sót đến khi đủ **200 xu để bán trang trại**. Không còn giới hạn thắng sau 5 đêm.

Cảnh đồng quê bao quanh 360° gồm mặt đất nối liền, ruộng ngũ cốc theo luống, đường quê uốn vào rừng, vườn cây, bìa rừng gần bao quanh phía sau và hai bên, rừng xa cùng hai lớp đồi ở chân trời; cảnh bao quanh không có nhà hàng xóm hay cột điện. Khu chơi vẫn giới hạn bởi hàng rào trại; cảnh xa đổi màu theo ngày đêm và thời tiết. Cừu có hoạt ảnh thở, ăn cỏ, nhai, nhìn quanh, chớp mắt, giật tai và đổi chân; khi soi, chuyển động giảm để giữ dấu hiệu dễ quan sát. Shiba ngồi cạnh chuồng, quay đầu, vẫy đuôi, ngáp và có biểu cảm báo sói. Mái bạt, tán cây và ngũ cốc lay theo gió; người bán chào khi đến gần, đèn lồng đung đưa, khói bếp trôi, chim và bướm xuất hiện ban ngày, đom đóm ban đêm. `dev/scenery.html` là màn xem hình ảnh độc lập, không truy cập bản lưu.

Đồ họa: cừu có lông mềm, chớp mắt và cử động tai; chuồng có sàn ván, cửa sổ, xà gỗ và đèn lồng. Sân ngoài có đường đá, nhà nhỏ, giếng, bãi cỏ thu hoạch riêng và quầy hàng 3D. Cỏ sân dùng lá cong thấp, các cụm lá và hoa nhỏ ven rào thay cho bụi tròn và cỏ khối nhọn; cỏ thu hoạch cũng dùng phiến cong và hoa có thân. Ban ngày ra khỏi cửa chuồng, đến quầy bên phải và nhấn E để mua đồ; Tab vẫn mở quản lý trại. Các vật phẩm có hình minh họa riêng trong cửa hàng và túi đồ.

Khi phát hiện sói, trận đấu chuyển sang đấu trường 3D với sói đúng loài và các vùng báo chiêu. Người chơi di chuyển, né, đỡ và phản đòn trực tiếp. Cảnh chuồng tạm ngừng render khi đang ở trận đấu để tránh chạy hai cảnh 3D cùng lúc.

## Chạy và kiểm tra

Chuồng hiện dùng chung một đàn, không chia A/B. Bản mới bắt đầu với rào tạm và sức chứa 8 cừu. Trong mục sinh hoạt, mỗi ngày chọn một việc xây dựng: gia cố rào (3 cấp), mở rộng chuồng (8 → 12 → 16 chỗ) hoặc lắp mái. Việc xây dựng tốn xu và không tự lặp mỗi lần bấm. Bản lưu cũ có đàn lớn giữ đủ sức chứa và chuyển cừu về chuồng chung.

Thương nhân ghé trại cách hai ngày một lần, vào ban ngày của ngày 1, 3, 5… và bán cả đồ dùng lẫn trang bị. Ngày nghỉ hoặc ban đêm, người bán, gian hàng, hành lý, điểm tương tác và va chạm đều được gỡ; không thể mua qua menu. Rìu thép tăng 35% sát thương nông cụ; súng săn cần mua để mở khóa, kèm 3 viên đạn; giáp nhẹ/nặng tăng 10%/20% sát thương khi còn độ bền. Giáp vỡ vẫn có thể sửa, sau đó nhận lại chỉ số tăng sát thương.

Vòng sinh hoạt: ban ngày mở cửa chuồng (E ở cửa hoặc Tab), đàn ra bãi phía tây. Người chơi đi qua sân tới bãi cỏ phía đông để cắt cỏ dự trữ trực tiếp khi trời khô. Hai luống được theo dõi riêng, mỗi luống chỉ cắt một lần/ngày. Cỏ mọc lại sáng hôm sau. Dùng búp bê cầu nắng trong túi đồ để bảo đảm ngày mai có thể phơi cỏ.

Nhà phía tây nam có cửa mở và giường; E gần giường mở sinh hoạt/ngủ. Chọn ngủ và xác nhận để qua sáng hôm sau: sói vẫn ăn cừu, kể cả khi bỏ qua đêm từ ban ngày. Kho phía cạnh nhà có các bó cỏ hiển thị theo tồn kho. Quầy chỉ xuất hiện vào ban ngày khi thương nhân ghé; lịch lần tới được ghi trong sinh hoạt. Bản lưu cũ được bổ sung dụng cụ tông đơ và dữ liệu sinh hoạt, giữ nguyên tiền và đàn.

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
node --test src/game/*.test.js
```

## Điều khiển

- Chuột tự khóa khi vào chơi. Ctrl phải mở/khóa chuột; Ctrl trái không đổi chế độ. WASD đi lại, Shift đi nhanh, C cúi. Rê chuột để nhìn, không cần giữ kéo; Esc mở cài đặt (âm thanh, độ nhạy chuột). Nhấn Tiếp tục chơi để khóa lại chuột; E mở kiểm tra. Điện thoại dùng cụm mũi tên và kéo cảnh.
- F bật/tắt đèn pin. Hướng tâm ngắm vào con vật gần mình, **E** hoặc nút tương tác để xem tại chỗ. Ban ngày xem cừu miễn phí; ban đêm mới điều tra tốn năng lượng.
- Chọn mắt, chân, miệng, thân hoặc đuôi để camera tiến gần bộ phận đó. Kiểm tra tốn 1 trong 2 năng lượng. Cạo lông tốn 1 năng lượng và 1 pin tông đơ, giá 2 xu/pin. Esc đứng dậy.
- Khi chiến đấu: WASD di chuyển, J đánh, K đỡ, Space né; nông cụ không hao tài nguyên, súng dùng đạn. Sói báo vùng nguy hiểm trước khi ra chiêu, có khoảng hồi sức để phản đòn.
- Items dùng thuốc/giáp sửa/buff, Call Dog chặn một đòn và tăng 5% sát thương. Chó đánh phụ khi sói hồi chiêu, không kết liễu; chỉ kiểm tra chuồng mới làm chó nghỉ hết đêm.
- Ban ngày, đi vào luống ở bãi cỏ phía đông và nhấn E để cắt cỏ dự trữ; không cắt được khi trời mưa.

## Các luật Core GDD đã nối

- Cừu lớn: 1 xu/ngày khi đạt 70 độ no; cừu con: 2 ngày lớn, chưa sinh tiền. Ngày mưa cần cỏ khô để đàn đủ no.
- Cửa hàng ban ngày có cỏ khô, pin, tông đơ, búp bê cầu nắng và cừu giống. Người bán ở sân, đến gần nhấn E để mở hàng; bán cả vũ khí, đạn, giáp, sửa giáp, bia và vật phẩm buff. Nâng cấp hàng rào, sức chứa và mái che nằm trong sinh hoạt, tối đa một công trình/ngày.
- Sáu loài: thường/dại từ đêm 1; con/gầy từ đêm 4; Alpha/trắng từ đêm 8. Móng, mắt/dãi, răng, sườn và bụng hiển thị trên mô hình. Chó không nhận ra sói con. Sói trắng ngụy trang hoàn hảo.
- Sói mạnh thêm mỗi 3 đêm, chọn ngẫu nhiên kỹ năng PvE theo loài và tăng áp lực trong trận với giới hạn mật độ. Dại gây chảy máu, gầy né 30%, Alpha ăn 2 cừu, sói trắng che sương từ giữa ra ngoài. Gầy/con tích lũy 0,5 cừu mỗi đêm.
- Trăng tròn mỗi 7 đêm: mọi dấu hiệu bị ẩn, có tiếng hú; cạo lông vẫn xác định được sói.
- Sói bỏ sót ở lại và tiếp tục ăn cừu. Thua khi số sói **vượt** 50% cừu thật, khi hết cừu hoặc khi HP về 0. Đủ 200 xu phải bấm Bán trang trại vào ban ngày để thắng.
- Sổ tay chủ cũ có ngay từ đầu với toàn bộ loài/cơ chế. Thần Sói bằng sương hiện dần ở rìa rừng theo ngày sinh tồn.

## Kiến trúc và ví dụ dữ liệu

- [Core GDD, cấu trúc React, state và thuật toán](docs/CORE_GDD.md)
- [JSON Player, Sheep, Wolf, Inventory và một lượt chơi](docs/state-example.json)
- [Các prompt hình minh họa đã tạo](public/assets/art/PROMPTS.md)
- `/dev/combat.html`: thử PvE từng loài trong môi trường phát triển, không đọc/ghi bản lưu người chơi.

Các phần chính chạy qua `src/game/rules.js`, `catalog.js`, `PhasePanels.jsx`, `FirstPersonScene.jsx`, `PveEngine.js` và `PveCombat.jsx`. `src/canvas` giữ engine Canvas cũ để tham khảo. Các màn hình cũ trong `src/components`, reducer/context cũ không nằm trong luồng UI mới.

Bản lưu v3 dùng khóa `under-the-wool-v3`. Bản v2 được chuyển tiền, HP, ngày và đàn sang một buổi sáng áp dụng luật mới; khóa v2 vẫn giữ nguyên. Canvas đang bay và vị trí camera không lưu, còn HP/giáp/đạn/hỗ trợ chó được lưu. WebGL 2 cần được bật trong trình duyệt. Nếu không bắt được chuột, kéo chuột và mũi tên vẫn dùng được.


## Cân bùa và phép thuật

Thương nhân bí ẩn ở bên trái sân có chiếc cân riêng; E mở nghi thức trong game. Có thể cân nhiều lần trong ngày khi ông ấy còn ở trại. Chọn Thấp (3–11), Giữa (đúng 12) hoặc Cao (13–18), trả 5 Xu để tung ba xúc xắc phép trong popup. Tổng điểm được phân nhóm kể cả bộ ba giống nhau. Đoán đúng được ×2 may mắn; trượt giữ ×1. Máy xét cửa đã chọn trước: Cao/Thấp thắng 28%, thua 72%; Giữa thắng 5%, thua 95%. Nếu chọn Cao/Thấp: 5% kết quả ra đúng 12, 67% ra cửa đối diện. Nếu chọn Giữa: 47,5% ra Thấp và 47,5% ra Cao. Sau khi chốt thắng/thua, ba mặt xúc xắc được tạo đều trong nhóm tổng phù hợp rồi đảo vòng vị trí. Giao diện chỉ trình bày luật chọn tổng và phần thưởng; thuật toán và tỉ lệ xúc xắc được ghi ở tài liệu kỹ thuật này. Bát đĩa và xúc xắc là mô hình Three.js có vật liệu sứ, ánh sáng, bóng đổ và camera nhìn thẳng từ trên xuống. Popup lắc xong vẫn úp kín: kéo bát theo hướng bất kỳ ít nhất 85 px rồi thả để mở; kéo ngắn sẽ trả bát về vị trí cũ. Hỗ trợ chuột, cảm ứng và phím mũi tên/Enter. Kết quả được lưu trước khi mở; đóng/mở không đổi kết quả và chưa mở thì không thể cân. Có thể bỏ qua lắc để cân với ×1. May mắn lưu ngay và dùng đúng một lượt cân; có thể tung lại nhiều lần sau khi mở bát, mỗi lần 5 Xu, may mắn mới thay kết quả trước và không cộng dồn. Hết ngày hệ số cũ không còn hiệu lực.

Người chơi chọn 1–12 Xu đặt bên trái, độc lập phí lắc. Đĩa Xu cân bằng hoặc nặng hơn nhận lá bùa ngẫu nhiên bên phải; thua mất Xu đặt. Sau khi nghi thức xong, nhấn Cân tiếp để chọn tiền mới, rồi có thể lắc hoặc cân ngay. Kết quả cũ đã trả tiền vẫn được giữ khi tải lại.

Trọng số bùa: Tụ Tài 4, Hao Tài 2, Cỏ Non 40, Mắt Cú 28, Da Đá 12, Phong Hành 10, Hỏa Bộc 5, Dịch Chuyển 4, Trăng Bạc 0,8 và Lợi Tức 0,2 (hiếm dần theo ngày). May mắn nhân trọng số căn hệ số cho bùa trung cấp và hệ số cho VIP, rồi chuẩn hóa về 100%. Xác suất cân thắng mỗi loại là min(98%, Xu×may mắn / (Xu×may mắn + sức nặng bùa)); bùa VIP nặng hơn. UI hiển thị xác suất nhận thực tế, gồm cả rút bùa và cân thắng. Tụ Tài cộng ngay 12 Xu, Hao Tài trừ 8 Xu nhưng không làm tiền âm; cả hai chỉ kích hoạt đúng một lần khi lộ bùa, không lưu trong túi.

UI dùng bảng màu kem, chữ xanh đậm, nút chính xanh lam và nút lắc cam; trạng thái vô hiệu vẫn giữ chữ rõ ràng.

Kết quả, số Xu và độ lệch được lưu ngay khi đặt. Cân thành công thì lá bùa lộ ký hiệu và bốc cháy, ấn phép vào túi đồ đúng một lần. Đóng/mở hoặc tải lại không đổi kết quả; nếu chuyển buổi khi nghi thức còn dở, kết quả được hoàn tất để không mất phần đã trả tiền.

Bùa gồm Cỏ Non (+2 cỏ), Mắt Cú (hồi 1 năng lượng điều tra, tối đa 2), Da Đá (chặn một đòn, hết hạn sáng mai), Trăng Bạc (+30% sát thương một trận), Hỏa Bộc (R/nút Bùa nổ, ném gây 34 sát thương chỉ lên sói), Dịch Chuyển (Q/nút, đi tức thời theo WASD hoặc lùi khỏi sói, 0,4 giây tránh đòn), Phong Hành (+35% tốc độ chạy một trận), Lợi Tức (150% thu nhập bình minh kế tiếp, làm tròn xuống; đàn đói vẫn 0). Buff không cộng dồn; Trăng Bạc không cộng với thuốc tăng lực. Nghi thức ngẫu nhiên đã trả tiền từ bản cũ giữ nguyên kết quả khi tải lại, kể cả Lời Nguyền Đói (sáng mai mất thêm 10 độ no); nghi thức mới rút bùa ngẫu nhiên, không chọn loại trước.

`dev/charms.html` kiểm thử cân và túi đồ; `dev/combat.html` có bùa để kiểm thử ném, dịch chuyển và buff. Cả hai độc lập với bản lưu người chơi. `charms.test.js` kiểm tra xác suất, tiền cược, tính duy nhất của kết quả, lưu/khôi phục, buff, thu nhập và phép chiến đấu.

Font UI dùng Segoe UI/Tahoma/Arial hỗ trợ tiếng Việt cài sẵn trên máy, không phụ thuộc tải font từ Google; tiêu đề và nội dung dùng cùng bộ chữ để tránh lệch dấu.

## Ngôn ngữ / Languages

Chọn Tiếng Việt hoặc English ngay ở màn hình đầu, hoặc tại Esc → Ngôn ngữ. Giao diện cập nhật ngay và nhớ lựa chọn trong `under-the-wool-language`, độc lập với bản lưu trang trại. Menu, cửa hàng, túi đồ, điều tra, chiến đấu, cân bùa, hướng dẫn, tấm biển 3D và thông báo có số liệu đều dùng bản dịch chung. Đổi ngôn ngữ không khởi tạo lại game hay thay đổi dữ liệu thực thể.

Bản dịch tiếng Anh nằm trong `src/game/locales/en.js`; lớp hiển thị `i18n.js` giữ nguyên ID, giá trị control và sự kiện, chỉ dịch nội dung/nhãn truy cập. Template `{x}` giữ nguyên số liệu và dịch các tên vật phẩm lồng nhau. `i18n.test.js` kiểm tra danh mục vật phẩm/sói, thông báo động, bản lưu, và chuyển ngôn ngữ.
