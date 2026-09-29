-- Restore the question bank for the eight published HTNV reading assignments.
-- Idempotent: preserves every other key in prediction_template.
UPDATE assignments a
SET prediction_template = jsonb_set(
      coalesce(a.prediction_template, '{}'::jsonb),
      '{questions}',
      to_jsonb(CASE t.public_id
        WHEN 'vo-nhat' THEN ARRAY[
          'Từ nhan đề Vợ nhặt, em dự đoán tình huống và hoàn cảnh sống của các nhân vật như thế nào?',
          'Theo em, một gia đình mới hình thành trong hoàn cảnh thiếu thốn sẽ gặp xung đột gì?',
          'Chi tiết hoặc hình ảnh nào em muốn kiểm chứng sau khi đọc? Vì sao?'
        ]
        WHEN 'chi-pheo' THEN ARRAY[
          'Từ nhan đề Chí Phèo, em dự đoán nhân vật trung tâm có số phận như thế nào?',
          'Xung đột giữa một con người và cộng đồng có thể phát sinh từ đâu?',
          'Điều gì có thể khiến một người thay đổi cách nhìn về bản thân?'
        ]
        WHEN 'xuan-toc-do-cuu-quoc' THEN ARRAY[
          'Cụm từ cứu quốc khiến em chờ đợi hành động và phẩm chất nào?',
          'Đặt tên Xuân Tóc Đỏ bên cạnh cụm từ cứu quốc có thể tạo ra nghịch lí gì?',
          'Em dự đoán đám đông sẽ đánh giá nhân vật dựa vào điều gì?'
        ]
        WHEN 'mua-la-rung-trong-vuon' THEN ARRAY[
          'Nhan đề Mùa lá rụng trong vườn gợi cho em sự thay đổi nào?',
          'Em dự đoán các thế hệ trong gia đình có thể bất đồng về giá trị gì?',
          'Theo em, hình ảnh khu vườn và lá rụng có thể gợi ý nghĩa gì?'
        ]
      END::text[]),
      true
    ),
    updated_at = now()
FROM literature_texts t
WHERE t.id = a.text_id
  AND a.public_id LIKE 'htnv-%-2026'
  AND t.public_id IN ('vo-nhat', 'chi-pheo', 'xuan-toc-do-cuu-quoc', 'mua-la-rung-trong-vuon');
