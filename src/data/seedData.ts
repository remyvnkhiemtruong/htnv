import type {
  PoeticAxis,
  LiteratureText,
  RubricMatrix,
  Assignment,
  User,
  StudentPortfolio,
  FeedbackItem,
  RubricAssessmentSubmission,
  AuditLog
} from '../types';

export const POETIC_AXES: PoeticAxis[] = [
  {
    id: 'plot_situation',
    order: 1,
    title: '1. Tình huống – Cốt truyện',
    shortName: 'Tình huống',
    description: 'Xác định tình huống, sự kiện và xung đột; giải thích chúng góp phần thể hiện chủ đề thế nào.',
    guidingQuestions: [
      'Tình huống truyện then chốt trong tác phẩm là gì (tình huống nhận thức, tâm trạng hay hành động)?',
      'Cốt truyện phát triển theo tuyến tính hay có sự đảo lộn trình tự sự kiện?',
      'Bước ngoặt nào đã làm biến đổi số phận hoặc nhận thức của nhân vật?'
    ],
    focusKeywords: ['Tình huống éo le', 'Xung đột kịch tính', 'Bước ngoặt', 'Mở nút'],
    iconName: 'GitBranch'
  },
  {
    id: 'character_detail',
    order: 2,
    title: '2. Nhân vật – Chi tiết nghệ thuật',
    shortName: 'Nhân vật',
    description: 'Chọn chi tiết về ngoại hình, lời nói, hành động và tâm trạng để phân tích nhân vật.',
    guidingQuestions: [
      'Nhân vật được xây dựng qua những phương diện nào (ngoại hình, ngôn ngữ, nội tâm)?',
      'Chi tiết nghệ thuật nào giàu sức gợi nhất (chi tiết giọt nước mắt, bát cháo hành, que diêm...)?',
      'Chi tiết nào cho thấy khó khăn, mong muốn hoặc lựa chọn của nhân vật?'
    ],
    focusKeywords: ['Tâm lý nhân vật', 'Chi tiết đắt giá', 'Bi kịch số phận', 'Khát vọng sống'],
    iconName: 'UserCheck'
  },
  {
    id: 'narrator_pov',
    order: 3,
    title: '3. Người kể chuyện – Điểm nhìn',
    shortName: 'Điểm nhìn',
    description: 'Xác định ngôi kể, sự dịch chuyển điểm nhìn trần thuật (điểm nhìn bên ngoài sang điểm nhìn bên trong, điểm nhìn nửa trực tiếp).',
    guidingQuestions: [
      'Tác phẩm sử dụng người kể chuyện ngôi thứ mấy? Thái độ của người kể chuyện với nhân vật?',
      'Có sự chuyển dịch điểm nhìn trần thuật giữa tác giả và ý thức nhân vật không?',
      'Điểm nhìn ấy tạo ra hiệu quả thẩm mỹ gì trong việc dẫn dắt cảm xúc người đọc?'
    ],
    focusKeywords: ['Ngôi kể thứ ba', 'Điểm nhìn nửa trực tiếp', 'Đa thanh', 'Thấu cảm'],
    iconName: 'Eye'
  },
  {
    id: 'space_time',
    order: 4,
    title: '4. Không gian – Thời gian nghệ thuật',
    shortName: 'Không - Thời gian',
    description: 'Khảo sát không gian hiện thực, không gian biểu tượng, thời gian tuyến tính, thời gian hồi tưởng và thời gian tâm lý.',
    guidingQuestions: [
      'Bối cảnh không gian mang tính chất gì (không gian ngột ngạt tù túng, không gian ánh sáng - bóng tối)?',
      'Thời gian trong truyện trôi qua như thế nào (thời gian hiện tại, quá khứ, hay thời gian tâm trạng)?',
      'Không - thời gian nghệ thuật tương quan thế nào với nội tâm và dự cảm tương lai của nhân vật?'
    ],
    focusKeywords: ['Không gian tù túng', 'Thời gian tâm trạng', 'Ánh sáng & bóng tối', 'Thời khắc chuyển giao'],
    iconName: 'Clock'
  },
  {
    id: 'language_tone_symbol',
    order: 5,
    title: '5. Ngôn ngữ – Giọng điệu – Biểu tượng',
    shortName: 'Ngôn ngữ & Biểu tượng',
    description: 'Phân tích từ ngữ, giọng điệu và hình ảnh; giải thích tác dụng bằng dẫn chứng.',
    guidingQuestions: [
      'Ngôn ngữ truyện mang phong vị gì (khẩu ngữ nông thôn, chất thơ trữ tình hay triết lý sắc lạnh)?',
      'Giọng điệu chủ đạo của văn bản là gì và có sự biến hóa ra sao?',
      'Hình ảnh hoặc biểu tượng nghệ thuật nào có tính khái quát cao nhất?'
    ],
    focusKeywords: ['Chất thơ', 'Giọng điệu trắc ẩn', 'Hình ảnh biểu tượng', 'Khẩu ngữ sinh động'],
    iconName: 'Feather'
  },
  {
    id: 'form_argument',
    order: 6,
    title: '6. Hình thức – Nội dung và Lập luận',
    shortName: 'Tổng hợp & Lập luận',
    description: 'Liên kết các yếu tố hình thức với nội dung; sắp xếp luận điểm và dẫn chứng cho bài phân tích.',
    guidingQuestions: [
      'Các yếu tố thi pháp ở trên phối hợp với nhau thế nào để thể hiện tư tưởng chủ đề?',
      'Luận điểm phân tích của em có mạch lạc, dẫn chứng có chính xác và thuyết phục không?',
      'Bài học nhân sinh hoặc giá trị thời đại mà tác phẩm gợi mở cho độc giả hôm nay là gì?'
    ],
    focusKeywords: ['Tính chỉnh thể', 'Hệ thống luận điểm', 'Dẫn chứng xác đáng', 'Tư tưởng nhân đạo'],
    iconName: 'BookOpen'
  }
];

export const LITERATURE_TEXTS: LiteratureText[] = [
  {
    id: 'vo-nhat',
    title: 'Vợ nhặt',
    author: 'Kim Lân',
    year: '1954 (viết về nạn đói 1945)',
    genre: 'Truyện ngắn hiện thực',
    synopsis: 'Tác phẩm kể về việc Tràng - một người nông dân nghèo khổ, xấu xí giữa nạn đói khủng khiếp năm 1945 - bất ngờ "nhặt" được một người vợ chỉ bằng vài bát bánh đúc và lời đùa vu vơ.',
    excerpt: `Sáng hôm sau, mặt trời lên bằng con sào, Tràng mới trở dậy. Trong người êm ái lơ lửng như người vừa ở trong giấc mơ đi ra. Việc hắn có vợ đến hôm nay hắn vẫn còn ngỡ ngàng như không phải...`,
    fullContent: `Cái đói đã tràn đến xóm này từ lúc nào. Những gia đình từ những vùng Nam Định, Thái Bình, đội chiếu lũ lượt bồng bế, dắt díu nhau lên xanh xám như những bóng ma, và nằm ngổn ngang khắp lều chợ. Người chết như ngả rạ. Không buổi sáng nào người trong làng đi chợ, đi làm đồng không gặp ba bốn cái xác nằm còng queo bên đường. Không khí vẩn lên mùi ẩm thối của rác rưởi và mùi mùi gây của xác người.
Giữa cái cảnh tối sầm lại vì đói khát ấy, một buổi chiều người trong xóm ngụ cư bỗng thấy Tràng dẫn một người đàn bà lạ về nhà. Bà con xóm ngụ cư ngạc nhiên, rồi họ hiểu ra, nét mặt ai nấy đều rạng rỡ hẳn lên.
Bà cụ Tứ - mẹ Tràng - về nhà, nghe con trai thưa chuyện, lòng bà nghẹn lại. Vừa mừng, vừa tủi, vừa lo: "Biết rằng chúng nó có nuôi nổi nhau sống qua được cái thì này không?". Nhưng rồi người mẹ nghèo thương cảm cho người con dâu: "Người ta có gặp bước khó khăn này người ta mới thèm lấy đến con mình...".
Bữa cơm ngày đói đón nàng dâu mới thật thảm hại: một lùm rau chuối thái rối, một đĩa muối ăn với cháo loãng. Giữa bữa, bà mẹ bưng ra một nồi cháo cám bốc khói nghi ngút, đắng chát nhưng vẫn khen ngon để động viên các con.
Ngoài đình rộn lên tiếng trống thúc thuế. Người vợ nhặt báo tin trên mạn Thái Nguyên, Bắc Giang người ta đã phá kho thóc của Nhật chia cho người đói. Trong tâm trí Tràng hiện lên hình ảnh lá cờ đỏ sao vàng bay phấp phới trên đê Sộp...`,
    historicalContext: 'Bối cảnh nạn đói năm Ất Dậu 1945 cướp đi hơn 2 triệu sinh mạng đồng bào. Kim Lân đã viết nên bài ca về sự sống, tình người và khát vọng vươn tới tương lai cách mạng của người nông dân nghèo.',
    tags: ['Hiện thực', 'Nạn đói 1945', 'Tình người', 'Khát vọng sống']
  },
  {
    id: 'chi-pheo',
    title: 'Chí Phèo',
    author: 'Nam Cao',
    year: '1941',
    genre: 'Truyện ngắn hiện thực phê phán',
    synopsis: 'Kiệt tác của Nam Cao phản ánh tấn bi kịch bị tha hóa, lưu manh hóa và bi kịch bị cự tuyệt quyền làm người lương thiện.',
    excerpt: `Hắn vừa đi vừa chửi. Bao giờ cũng thế, cứ rượu xong là hắn chửi. Bắt đầu chửi trời...`,
    fullContent: `Chí Phèo vốn là một đứa trẻ mồ côi bị bỏ rơi nơi lò gạch cũ. Lớn lên, Chí trở thành một anh canh điền hiền lành như đất, giàu lòng tự trọng. Vì sự ghen tuông vô cớ của Bá Kiến, Chí bị đẩy vào tù ngục thực dân.
Bảy tám năm sau, Chí trở về trong bộ dạng một thằng lưu manh gớm ghiếc, đầu trọc lốc, răng cạo trắng hớn, mặt đầy những vết sẹo dọc ngang. Bá Kiến đã biến Chí thành tay sai đắc lực, con quỷ dữ của làng Vũ Đại chuyên rạch mặt ăn vạ và đâm thuê chém mướn.
Cuộc gặp gỡ tình cờ với Thị Nở bên bờ sông và bát cháo hành ấm nóng đượm tình người đã đánh thức bản tính lương thiện ngủ quên trong Chí. Chí khát khao được làm hòa với mọi người, khát khao một mái ấm gia đình bình dị.
Nhưng định kiến nghiệt ngã của bà cô Thị Nở và xã hội phong kiến tàn nhẫn đã chặn đứng con đường hoàn lương của Chí. Chí rơi vào tận cùng đau đớn, uống rượu say, xách dao đến nhà Bá Kiến đâm chết kẻ thù rồi tự kết liễu đời mình. Tiếng kêu tuyệt vọng: "Ai cho tao lương thiện?" còn vang vọng mãi...`,
    historicalContext: 'Xã hội nông thôn Việt Nam trước 1945 với những áp bức tàn bạo của tầng lớp cường hào ác bá.',
    tags: ['Hiện thực phê phán', 'Bi kịch tha hóa', 'Khát vọng lương thiện', 'Nam Cao']
  },
  {
    id: 'hai-dua-tre',
    title: 'Hai đứa trẻ',
    author: 'Thạch Lam',
    year: '1938',
    genre: 'Truyện ngắn trữ tình',
    synopsis: 'Bức tranh phố huyện nghèo lúc chập tối đến đêm khuya qua tâm hồn nhạy cảm của hai chị em Liên và An.',
    excerpt: `Chiều, chiều rồi. Một chiều êm ả như ru, văng vẳng tiếng ếch nhái ran ngoài đồng ruộng...`,
    fullContent: `Liên và An trông coi một gian hàng tạp hóa nhỏ ở phố huyện nghèo tàn tạ. Khi bóng tối buông xuống, những kiếp người lam lũ lần lượt xuất hiện: mẹ con chị Tí với manh chiếu và ngọn đèn dầu lay lắt, bác Siêu gánh phở thơm lừng nhưng là thứ quà xa xỉ...
Dù buồn ngủ ríu mắt, hai chị em vẫn cố thức để đợi chuyến tàu đêm từ Hà Nội về. Đoàn tàu rực rỡ ánh sáng, ồn ào và lấp lánh đi qua trong khoảnh khắc, mang theo hồi ức về một Hà Nội sáng rực, huyên náo của tuổi thơ.`,
    historicalContext: 'Xã hội tiểu tư sản thành thị và cư dân nghèo phố huyện thập niên 1930 dưới ngòi bút đậm chất thơ của Thạch Lam.',
    tags: ['Trữ tình', 'Bóng tối & Ánh sáng', 'Chuyến tàu đêm', 'Thạch Lam']
  },
  {
    id: 'nguoi-o-ben-song-chau',
    title: 'Người ở bến sông Châu',
    author: 'Sương Nguyệt Minh',
    year: '1997',
    genre: 'Truyện ngắn hiện đại',
    synopsis: 'Tác phẩm kể về số phận bi kịch và vẻ đẹp tâm hồn của dì Mây - người nữ y tá chiến trường trở về sau chiến tranh với thương tật và nỗi đau tình duyên dang dở bên bến sông Châu.',
    excerpt: `Bến sông Châu chiều nào cũng dạt dào sóng nước. Dì Mây ngồi tựa vào gốc đa, mắt nhìn xa xăm về phía bãi bồi...`,
    fullContent: `Dì Mây trở về làng sau những năm tháng khói lửa ác liệt ở chiến trường. Nhưng trớ trêu thay, đúng ngày dì trở về cũng là ngày chú San - người yêu thủy chung của dì - đang tổ chức đám cưới với cô Thanh vì tưởng dì đã hy sinh.
Dì Mây nén nỗi đau riêng, từ chối sự níu kéo của chú San để giữ trọn hạnh phúc cho gia đình chú. Dì lui về bến sông Châu, ngày ngày chở đò qua sông và dũng cảm vượt cạn cứu sống mẹ con cô Thanh trong đêm giông bão.`,
    historicalContext: 'Thời kỳ hậu chiến Việt Nam với những mất mát âm thầm và phẩm chất vị tha cao cả của người phụ nữ.',
    tags: ['Hậu chiến', 'Điểm nhìn trần thuật', 'Tình mẫu tử', 'Vị tha', 'Demo']
  }
];

export const DEFAULT_RUBRIC: RubricMatrix = {
  id: 'rubric-poetics-std',
  title: 'Ma trận Rubric Đánh giá Năng lực Đọc hiểu theo 6 Trục Thi pháp',
  criteria: [
    {
      id: 'crit-plot',
      axisId: 'plot_situation',
      title: 'Tiêu chí 1: Phát hiện và phân tích Tình huống – Cốt truyện',
      weight: 1,
      levels: [
        {
          level: 1,
          label: 'Chưa đạt',
          score: 1.0,
          description: 'Chỉ tóm tắt lại các sự việc rời rạc, chưa nhận diện được bản chất tình huống truyện và ý nghĩa của bước ngoặt.',
          observableIndicators: ['Kể lể sự việc bề mặt', 'Chưa nêu được loại tình huống', 'Thiếu dẫn chứng bước ngoặt']
        },
        {
          level: 2,
          label: 'Đạt',
          score: 2.0,
          description: 'Xác định đúng tình huống truyện chính nhưng phân tích còn sơ lược, chưa làm rõ tác động đến tâm lý nhân vật.',
          observableIndicators: ['Gọi đúng tên tình huống', 'Có dẫn chứng nhưng giải thích còn chung chung']
        },
        {
          level: 3,
          label: 'Khá',
          score: 3.0,
          description: 'Phân tích mạch lạc diễn biến cốt truyện, làm rõ vai trò của tình huống trong việc tạo kịch tính và bộc lộ chủ đề.',
          observableIndicators: ['Lập luận chặt chẽ', 'Phân tích được xung đột bên trong và bên ngoài']
        },
        {
          level: 4,
          label: 'Xuất sắc',
          score: 4.0,
          description: 'Đánh giá sâu sắc tính độc đáo của tình huống, đối chiếu các bước ngoặt với chiều sâu tư tưởng nhân sinh của tác giả.',
          observableIndicators: ['Khái quát hóa thẩm mỹ xuất sắc', 'Liên hệ bối cảnh văn học', 'Lập luận sắc sảo']
        }
      ]
    },
    {
      id: 'crit-char',
      axisId: 'character_detail',
      title: 'Tiêu chí 2: Cảm thụ Nhân vật & Giải mã Chi tiết nghệ thuật',
      weight: 1,
      levels: [
        {
          level: 1,
          label: 'Chưa đạt',
          score: 1.0,
          description: 'Mô tả nhân vật một chiều, bỏ qua các chi tiết nghệ thuật đắt giá hoặc chỉ trích dẫn hình thức.',
          observableIndicators: ['Liệt kê chi tiết không chọn lọc', 'Nhận xét sơ sài']
        },
        {
          level: 2,
          label: 'Đạt',
          score: 2.0,
          description: 'Chỉ ra được đặc điểm số phận và tâm lý nhân vật; có phân tích ít nhất 1 chi tiết nghệ thuật tiêu biểu.',
          observableIndicators: ['Có dẫn chứng chi tiết', 'Hiểu được tâm lý bề mặt']
        },
        {
          level: 3,
          label: 'Khá',
          score: 3.0,
          description: 'Phân tích tinh tế diễn biến nội tâm phức tạp của nhân vật; giải mã sâu sắc sức gợi của các chi tiết then chốt.',
          observableIndicators: ['Khai thác chi tiết biểu tượng', 'Nắm bắt được sự chuyển biến tâm trạng']
        },
        {
          level: 4,
          label: 'Xuất sắc',
          score: 4.0,
          description: 'Khám phá trọn vẹn bi kịch và vẻ đẹp tâm hồn nhân vật; chứng minh được giá trị "chi tiết nhỏ làm nên nhà văn lớn".',
          observableIndicators: ['Phân tích tâm lý học nhân vật xuất sắc', 'Đối thoại liên văn bản sâu sắc']
        }
      ]
    },
    {
      id: 'crit-pov',
      axisId: 'narrator_pov',
      title: 'Tiêu chí 3: Nhận diện Người kể chuyện & Sự chuyển dịch Điểm nhìn',
      weight: 1,
      levels: [
        {
          level: 1,
          label: 'Chưa đạt',
          score: 1.0,
          description: 'Chưa phân biệt được ngôi kể và điểm nhìn trần thuật; đồng nhất người kể chuyện với tác giả.',
          observableIndicators: ['Nhầm lẫn ngôi kể', 'Không nhận ra điểm nhìn bên trong']
        },
        {
          level: 2,
          label: 'Đạt',
          score: 2.0,
          description: 'Xác định đúng ngôi kể và thái độ trần thuật cơ bản của tác giả đối với nhân vật.',
          observableIndicators: ['Xác định đúng ngôi kể', 'Nêu được giọng điệu khái quát']
        },
        {
          level: 3,
          label: 'Khá',
          score: 3.0,
          description: 'Chỉ ra được sự dịch chuyển điểm nhìn từ người kể chuyện sang ý thức nhân vật (lời nửa trực tiếp).',
          observableIndicators: ['Chỉ rõ lời nửa trực tiếp', 'Phân tích hiệu quả đồng cảm']
        },
        {
          level: 4,
          label: 'Xuất sắc',
          score: 4.0,
          description: 'Đánh giá bậc thầy nghệ thuật trần thuật đa thanh, phân tích tác động thẩm mỹ của các điểm nhìn phức hợp.',
          observableIndicators: ['Phân tích cấu trúc trần thuật hiện đại', 'Lập luận sắc bén']
        }
      ]
    },
    {
      id: 'crit-spacetime',
      axisId: 'space_time',
      title: 'Tiêu chí 4: Khảo sát Không gian – Thời gian nghệ thuật',
      weight: 1,
      levels: [
        {
          level: 1,
          label: 'Chưa đạt',
          score: 1.0,
          description: 'Chỉ nhắc tới địa điểm và mốc thời gian vật lý, chưa thấy được tính biểu trưng nghệ thuật.',
          observableIndicators: ['Xem không - thời gian chỉ là bối cảnh địa lý']
        },
        {
          level: 2,
          label: 'Đạt',
          score: 2.0,
          description: 'Nhận ra được sự tương phản không gian (sáng/tối, rộng/hẹp) và nhịp điệu thời gian cơ bản.',
          observableIndicators: ['Chỉ ra tương phản ánh sáng/bóng tối']
        },
        {
          level: 3,
          label: 'Khá',
          score: 3.0,
          description: 'Phân tích được không gian tâm trạng và thời gian tâm lý trong mối tương quan với số phận nhân vật.',
          observableIndicators: ['Khai thác thời gian hồi tưởng/tâm trạng', 'Có dẫn chứng đối sánh']
        },
        {
          level: 4,
          label: 'Xuất sắc',
          score: 4.0,
          description: 'Lý giải sâu sắc quy luật vận động của không - thời gian nghệ thuật như một phương thức kiến tạo thế giới quan của tác giả.',
          observableIndicators: ['Khái quát triết lý thời gian - không gian', 'Liên hệ phong cách tác giả']
        }
      ]
    },
    {
      id: 'crit-lang',
      axisId: 'language_tone_symbol',
      title: 'Tiêu chí 5: Giải mã Ngôn ngữ, Giọng điệu & Biểu tượng nghệ thuật',
      weight: 1,
      levels: [
        {
          level: 1,
          label: 'Chưa đạt',
          score: 1.0,
          description: 'Chưa nhận diện được đặc trưng ngôn từ và giọng điệu; giải thích biểu tượng một cách suy diễn tùy tiện.',
          observableIndicators: ['Nhận xét cảm tính', 'Không bám sát văn bản']
        },
        {
          level: 2,
          label: 'Đạt',
          score: 2.0,
          description: 'Chỉ ra được lớp từ ngữ đặc sắc (khẩu ngữ, từ láy...) và gọi tên được giọng điệu chủ đạo.',
          observableIndicators: ['Liệt kê từ ngữ tiêu biểu', 'Nêu được giọng điệu']
        },
        {
          level: 3,
          label: 'Khá',
          score: 3.0,
          description: 'Phân tích tác dụng thẩm mỹ của sự biến hóa giọng điệu và giải mã hợp lý các tầng nghĩa biểu tượng.',
          observableIndicators: ['Phân tích ngữ điệu đa tầng', 'Giải mã biểu tượng thuyết phục']
        },
        {
          level: 4,
          label: 'Xuất sắc',
          score: 4.0,
          description: 'Cảm nhận xuất thần chất thơ/chất hiện thực trong ngôn ngữ văn xuôi; khám phá biểu tượng ở tầm triết mỹ cao.',
          observableIndicators: ['Phân tích phong cách ngôn ngữ cá nhân nhà văn', 'Ngôn ngữ bình luận truyền cảm']
        }
      ]
    },
    {
      id: 'crit-synthesis',
      axisId: 'form_argument',
      title: 'Tiêu chí 6: Tính Chỉnh thể Hình thức – Nội dung & Lập luận Sư phạm',
      weight: 1,
      levels: [
        {
          level: 1,
          label: 'Chưa đạt',
          score: 1.0,
          description: 'Các phần phân tích rời rạc, thiếu tính liên kết hữu cơ; lập luận thiếu căn cứ văn bản.',
          observableIndicators: ['Ý rời rạc', 'Thiếu luận điểm rõ ràng']
        },
        {
          level: 2,
          label: 'Đạt',
          score: 2.0,
          description: 'Có hệ thống luận điểm cơ bản, rút ra được thông điệp tư tưởng của tác phẩm.',
          observableIndicators: ['Bố cục rõ ràng', 'Có kết luận khái quát']
        },
        {
          level: 3,
          label: 'Khá',
          score: 3.0,
          description: 'Chứng minh được sự thống nhất hài hòa giữa thi pháp và thông điệp nhân đạo; lập luận thuyết phục, cảm xúc chân thành.',
          observableIndicators: ['Luận điểm mạch lạc', 'Khái quát tư tưởng sâu sắc']
        },
        {
          level: 4,
          label: 'Xuất sắc',
          score: 4.0,
          description: 'Hồ sơ đọc thể hiện năng lực kiến tạo hiểu biết cá nhân độc đáo, có tư duy phản biện sắc sảo và bài học nhân văn sâu sắc.',
          observableIndicators: ['Tư duy độc lập, sáng tạo', 'Hành văn giàu sức thuyết phục và gợi cảm']
        }
      ]
    }
  ]
};

export const MOCK_USERS: User[] = [
  {
    id: 'user-std-1',
    name: 'Nguyễn Văn An',
    email: 'an.nguyen@thpt.edu.vn',
    role: 'student',
    className: '11 Chuyên Văn',
    assignedPeerRevieweeId: 'user-std-2'
  },
  {
    id: 'user-std-2',
    name: 'Trần Thị Bình',
    email: 'binh.tran@thpt.edu.vn',
    role: 'student',
    className: '11 Chuyên Văn',
    assignedPeerRevieweeId: 'user-std-1'
  },
  {
    id: 'HS-DEMO-01',
    name: 'Nguyễn Minh (Demo)',
    email: 'minh.demo@thpt.edu.vn',
    role: 'student',
    className: '10A2 - Demo'
  },
  {
    id: 'HS-DEMO-02',
    name: 'Lê Thảo My (Demo)',
    email: 'my.demo@thpt.edu.vn',
    role: 'student',
    className: '10A2 - Demo'
  },
  {
    id: 'HS-DEMO-03',
    name: 'Phạm Hải Đăng (Demo)',
    email: 'dang.demo@thpt.edu.vn',
    role: 'student',
    className: '10A2 - Demo'
  },
  {
    id: 'HS-DEMO-04',
    name: 'Vũ Ngọc Ánh (Demo)',
    email: 'anh.demo@thpt.edu.vn',
    role: 'student',
    className: '10A2 - Demo'
  },
  {
    id: 'HS-DEMO-05',
    name: 'Trần Gia Bảo (Demo)',
    email: 'bao.demo@thpt.edu.vn',
    role: 'student',
    className: '10A2 - Demo'
  },
  {
    id: 'HS-DEMO-06',
    name: 'Hoàng Kim Chi (Demo)',
    email: 'chi.demo@thpt.edu.vn',
    role: 'student',
    className: '10A2 - Demo'
  },
  {
    id: 'HS-DEMO-07',
    name: 'Đặng Tuấn Kiệt (Demo)',
    email: 'kiet.demo@thpt.edu.vn',
    role: 'student',
    className: '10A2 - Demo'
  },
  {
    id: 'HS-DEMO-08',
    name: 'Bùi Phương Linh (Demo)',
    email: 'linh.demo@thpt.edu.vn',
    role: 'student',
    className: '10A2 - Demo'
  },
  {
    id: 'HS-DEMO-09',
    name: 'Ngô Đức Thắng (Demo)',
    email: 'thang.demo@thpt.edu.vn',
    role: 'student',
    className: '10A2 - Demo'
  },
  {
    id: 'HS-DEMO-10',
    name: 'Dương Khánh Vy (Demo)',
    email: 'vy.demo@thpt.edu.vn',
    role: 'student',
    className: '10A2 - Demo'
  },
  {
    id: 'HS-DEMO-11',
    name: 'Trịnh Quốc Cường (Demo)',
    email: 'cuong.demo@thpt.edu.vn',
    role: 'student',
    className: '10A2 - Demo'
  },
  {
    id: 'HS-DEMO-12',
    name: 'Đỗ Thùy Trang (Demo)',
    email: 'trang.demo@thpt.edu.vn',
    role: 'student',
    className: '10A2 - Demo'
  }
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: 'assign-vo-nhat',
    title: 'Hồ sơ thi pháp: Ánh sáng sự sống và tình người trong "Vợ nhặt"',
    textId: 'vo-nhat',
    classId: '11A1',
    assignedDate: '2026-08-10',
    deadline: '2026-08-25',
    difficulty: 'Nâng cao',
    targetAxes: [
      'plot_situation',
      'character_detail',
      'narrator_pov',
      'space_time',
      'language_tone_symbol',
      'form_argument'
    ],
    prompt: 'Hãy lập hồ sơ đọc số khám phá thế giới nghệ thuật của truyện ngắn "Vợ nhặt" qua 6 trục thi pháp. Tập trung làm sáng tỏ: Nhà văn Kim Lân đã sử dụng những phương thức thi pháp độc đáo nào để khẳng định khát vọng sống bất diệt của con người bên bờ vực nạn đói 1945?',
    guidingSteps: [
      'Bước 1: Trích xuất và phân tích tình huống nhặt vợ "lạ lùng, éo le mà thấm đẫm tình thương".',
      'Bước 2: Giải mã chuyển biến tâm lý của Tràng, bà cụ Tứ và người vợ nhặt qua các chi tiết nghệ thuật đắt giá.',
      'Bước 3: Khảo sát đối lập không gian tối sầm nạn đói với không gian ấm cúng gia đình buổi sáng hôm sau.',
      'Bước 4: Tạo phiên bản v1.0, tiếp nhận phản hồi của GV/bạn học để chỉnh sửa nâng cấp lên v2.0.'
    ],
    rubricId: 'rubric-poetics-std'
  },
  {
    id: 'assign-chi-pheo',
    title: 'Hồ sơ thi pháp: Bi kịch cự tuyệt quyền làm người trong "Chí Phèo"',
    textId: 'chi-pheo',
    classId: '11A1',
    assignedDate: '2026-08-15',
    deadline: '2026-08-30',
    difficulty: 'Chuyên sâu',
    targetAxes: [
      'plot_situation',
      'character_detail',
      'narrator_pov',
      'space_time',
      'language_tone_symbol',
      'form_argument'
    ],
    prompt: 'Phân tích nghệ thuật trần thuật đa thanh, sự chuyển dịch điểm nhìn và tiếng kêu tuyệt vọng đòi quyền làm người lương thiện của Chí Phèo.',
    guidingSteps: [
      'Phân tích mở đầu tác phẩm bằng tiếng chửi của Chí Phèo.',
      'Giải mã biểu tượng bát cháo hành của Thị Nở.',
      'Đánh giá tiếng kêu cứu cuối cùng trước khi tự sát.'
    ],
    rubricId: 'rubric-poetics-std'
  },
  {
    id: 'assign-hai-dua-tre',
    title: 'Hồ sơ thi pháp: Chất thơ và nỗi niềm thức đợi trong "Hai đứa trẻ"',
    textId: 'hai-dua-tre',
    classId: '11A1',
    assignedDate: '2026-08-01',
    deadline: '2026-08-15',
    difficulty: 'Cơ bản',
    targetAxes: [
      'space_time',
      'character_detail',
      'language_tone_symbol',
      'form_argument'
    ],
    prompt: 'Khảo sát nghệ thuật tương phản ánh sáng - bóng tối và nhịp điệu thời gian tâm trạng nơi phố huyện nghèo tàn tạ.',
    guidingSteps: [
      'Liệt kê các chi tiết ánh sáng le lói đối lập màn đêm tịch mịch.',
      'Ý nghĩa biểu tượng của chuyến tàu đêm vút qua phố huyện.'
    ],
    rubricId: 'rubric-poetics-std'
  },
  {
    id: 'assign-song-chau',
    title: 'Phân tích người kể chuyện – điểm nhìn trong "Người ở bến sông Châu"',
    textId: 'nguoi-o-ben-song-chau',
    classId: '10A2 - Demo',
    assignedDate: '2026-08-12',
    deadline: '2026-08-28',
    difficulty: 'Nâng cao',
    targetAxes: [
      'narrator_pov',
      'character_detail',
      'space_time',
      'form_argument'
    ],
    prompt: 'Phân tích sự dịch chuyển điểm nhìn từ người kể chuyện toàn tri sang điểm nhìn bên trong của nhân vật dì Mây, làm sáng tỏ bi kịch và vẻ đẹp đức hy sinh cao cả.',
    guidingSteps: [
      'Bước 1: Xác định điểm nhìn trần thuật ở phần mở đầu và những đoạn độc thoại nội tâm.',
      'Bước 2: Phân tích sự chuyển đổi điểm nhìn khi dì Mây đối diện với đám cưới của chú San.',
      'Bước 3: Tiếp thu phản hồi sư phạm để bổ sung lí giải và dẫn chứng trong phiên bản v2.0 và v3.0.'
    ],
    rubricId: 'rubric-poetics-std'
  }
];

export const MOCK_STUDENT_PORTFOLIOS: Record<string, StudentPortfolio> = {
  'port-minh-song-chau': {
    id: 'port-minh-song-chau',
    assignmentId: 'assign-song-chau',
    studentId: 'HS-DEMO-01',
    studentName: 'Nguyễn Minh (Demo)',
    className: '10A2 - Demo',
    lastAutosavedAt: '2026-08-18T14:32:00Z',
    currentActiveVersion: 'v3.0',
    status: 'completed',
    currentDraft: {
      plot_situation: {
        axisId: 'plot_situation',
        analysisText: 'Tình huống truyện éo le khi dì Mây trở về đúng ngày chú San lấy vợ.',
        evidenceQuotes: []
      },
      character_detail: {
        axisId: 'character_detail',
        analysisText: `Nhân vật dì Mây là hiện thân của đức hy sinh và lòng vị tha cao cả:
- Thương tật thể xác không khuất phục được phẩm giá của người chiến sĩ.
- Hành động vượt cạn cứu con cô Thanh trong đêm mưa bão là đỉnh cao của vẻ đẹp nhân bản, xua tan mọi hận thù và bi kịch cá nhân.`,
        evidenceQuotes: []
      },
      narrator_pov: {
        axisId: 'narrator_pov',
        analysisText: `Tác phẩm "Người ở bến sông Châu" của Sương Nguyệt Minh sử dụng nghệ thuật trần thuật đa thanh với sự dịch chuyển điểm nhìn linh hoạt:
1. Mở đầu là điểm nhìn của người kể chuyện ngôi thứ ba khách quan, bao quát bến sông Châu và sự trở về của người nữ y tá chiến trường dì Mây.
2. Khi dì Mây bước vào bi kịch chú San lấy vợ, điểm nhìn trần thuật nhanh chóng dịch chuyển vào thế giới nội tâm bên trong của dì Mây. Việc chuyển điểm nhìn này giúp người đọc thấu cảm sâu sắc nỗi đau đớn tột cùng và sự giằng xé giữa tình yêu cá nhân với lòng vị tha cao cả.
3. Người kể chuyện không đứng ngoài phán xét mà hòa nhập vào từng hơi thở, từng dòng nước mắt nuốt ngược vào trong của dì Mây.`,
        evidenceQuotes: [
          {
            id: 'ev-songchau-1',
            text: 'Bến sông Châu chiều nào cũng dạt dào sóng nước. Dì Mây ngồi tựa vào gốc đa, mắt nhìn xa xăm về phía bãi bồi...',
            pageOrParagraph: 'Đoạn 1'
          }
        ]
      },
      space_time: {
        axisId: 'space_time',
        analysisText: 'Không gian bến sông Châu và thời gian hậu chiến mang tính biểu tượng sâu sắc.',
        evidenceQuotes: []
      },
      language_tone_symbol: {
        axisId: 'language_tone_symbol',
        analysisText: 'Ngôn ngữ giàu chất thơ, giọng điệu trần thuật trắc ẩn và nghẹn ngào.',
        evidenceQuotes: []
      },
      form_argument: {
        axisId: 'form_argument',
        analysisText: `Sự kết hợp nhuần nhuyễn giữa điểm nhìn bên trong và biểu tượng dòng sông Châu đã kiến tạo nên một khúc ca bi tráng về người phụ nữ Việt Nam thời hậu chiến.`,
        evidenceQuotes: []
      }
    },
    versions: [
      {
        id: 'ver-sc-1',
        versionNumber: 'v1.0',
        createdAt: '2026-08-14T08:30:00Z',
        createdBy: 'HS-DEMO-01',
        authorName: 'Nguyễn Minh (Demo)',
        changeSummary: 'Bản sơ thảo ban đầu nhận diện ngôi kể thứ ba.',
        responses: {
          plot_situation: { axisId: 'plot_situation', analysisText: 'Tình huống truyện éo le.', evidenceQuotes: [] },
          character_detail: { axisId: 'character_detail', analysisText: 'Nhân vật dì Mây hy sinh.', evidenceQuotes: [] },
          narrator_pov: {
            axisId: 'narrator_pov',
            analysisText: 'Người kể chuyện ngôi thứ ba toàn tri quan sát số phận dì Mây khi trở về sau chiến tranh...',
            evidenceQuotes: []
          },
          space_time: { axisId: 'space_time', analysisText: 'Không gian bến sông.', evidenceQuotes: [] },
          language_tone_symbol: { axisId: 'language_tone_symbol', analysisText: 'Giọng điệu trắc ẩn.', evidenceQuotes: [] },
          form_argument: { axisId: 'form_argument', analysisText: 'Chủ đề hậu chiến.', evidenceQuotes: [] }
        },
        isFrozen: true,
        isSubmitted: true
      },
      {
        id: 'ver-sc-2',
        versionNumber: 'v2.0',
        createdAt: '2026-08-16T10:15:00Z',
        createdBy: 'HS-DEMO-01',
        authorName: 'Nguyễn Minh (Demo)',
        changeSummary: 'Lí giải sâu hơn việc chuyển điểm nhìn bên trong tác động đến nhận thức người đọc.',
        responses: {
          plot_situation: { axisId: 'plot_situation', analysisText: 'Tình huống truyện éo le.', evidenceQuotes: [] },
          character_detail: { axisId: 'character_detail', analysisText: 'Nhân vật dì Mây hy sinh.', evidenceQuotes: [] },
          narrator_pov: {
            axisId: 'narrator_pov',
            analysisText: 'Người kể chuyện ngôi thứ ba chuyển điểm nhìn vào nội tâm dì Mây, giúp người đọc thấu hiểu nỗi đau đớn khi nén tình cảm riêng...',
            evidenceQuotes: []
          },
          space_time: { axisId: 'space_time', analysisText: 'Không gian bến sông.', evidenceQuotes: [] },
          language_tone_symbol: { axisId: 'language_tone_symbol', analysisText: 'Giọng điệu trắc ẩn.', evidenceQuotes: [] },
          form_argument: { axisId: 'form_argument', analysisText: 'Chủ đề hậu chiến.', evidenceQuotes: [] }
        },
        isFrozen: true,
        isSubmitted: true
      },
      {
        id: 'ver-sc-3',
        versionNumber: 'v3.0',
        createdAt: '2026-08-18T14:32:00Z',
        createdBy: 'HS-DEMO-01',
        authorName: 'Nguyễn Minh (Demo)',
        changeSummary: 'Bổ sung dẫn chứng bến sông Châu và hoàn thiện luận điểm.',
        responses: {
          plot_situation: { axisId: 'plot_situation', analysisText: 'Tình huống truyện éo le.', evidenceQuotes: [] },
          character_detail: { axisId: 'character_detail', analysisText: 'Nhân vật dì Mây hy sinh.', evidenceQuotes: [] },
          narrator_pov: {
            axisId: 'narrator_pov',
            analysisText: `Tác phẩm "Người ở bến sông Châu" của Sương Nguyệt Minh sử dụng nghệ thuật trần thuật đa thanh với sự dịch chuyển điểm nhìn linh hoạt:
1. Mở đầu là điểm nhìn của người kể chuyện ngôi thứ ba khách quan, bao quát bến sông Châu và sự trở về của người nữ y tá chiến trường dì Mây.
2. Khi dì Mây bước vào bi kịch chú San lấy vợ, điểm nhìn trần thuật nhanh chóng dịch chuyển vào thế giới nội tâm bên trong của dì Mây. Việc chuyển điểm nhìn này giúp người đọc thấu cảm sâu sắc nỗi đau đớn tột cùng và sự giằng xé giữa tình yêu cá nhân với lòng vị tha cao cả.
3. Người kể chuyện không đứng ngoài phán xét mà hòa nhập vào từng hơi thở, từng dòng nước mắt nuốt ngược vào trong của dì Mây.`,
            evidenceQuotes: [
              {
                id: 'ev-songchau-1',
                text: 'Bến sông Châu chiều nào cũng dạt dào sóng nước. Dì Mây ngồi tựa vào gốc đa, mắt nhìn xa xăm về phía bãi bồi...',
                pageOrParagraph: 'Đoạn 1'
              }
            ]
          },
          space_time: { axisId: 'space_time', analysisText: 'Không gian bến sông.', evidenceQuotes: [] },
          language_tone_symbol: { axisId: 'language_tone_symbol', analysisText: 'Giọng điệu trắc ẩn.', evidenceQuotes: [] },
          form_argument: { axisId: 'form_argument', analysisText: 'Chủ đề hậu chiến.', evidenceQuotes: [] }
        },
        isFrozen: true,
        isSubmitted: true
      }
    ]
  },
  'port-an-vo-nhat': {
    id: 'port-an-vo-nhat',
    assignmentId: 'assign-vo-nhat',
    studentId: 'user-std-1',
    studentName: 'Nguyễn Văn An',
    className: '11 Chuyên Văn',
    lastAutosavedAt: '2026-08-18T14:30:00Z',
    currentActiveVersion: 'v2.0',
    status: 'v2_in_revision',
    currentDraft: {
      plot_situation: {
        axisId: 'plot_situation',
        analysisText: `Tình huống truyện "Vợ nhặt" là một sáng tạo nghệ thuật độc đáo bậc nhất của Kim Lân. Đó là tình huống "nhặt vợ" vừa bi hài, vừa éo le nhưng lại chan chứa tình nhân ái. Giữa lúc nạn đói 1945 đang hoành hành dữ dội, người chết như ngả rạ, mạng người rẻ rúng như rơm rác, một người nông dân nghèo xấu xí lại "nhặt" được vợ chỉ bằng bốn bát bánh đúc và vài câu nói đùa.
Tình huống này mở ra 3 lớp bất ngờ: bất ngờ cho cả xóm ngụ cư, bất ngờ cho bà cụ Tứ người mẹ, và bất ngờ cho chính bản thân Tràng. Nhưng sâu xa hơn, tình huống này không đẩy con người vào vực thẳm bế tắc mà trở thành bước ngoặt đánh thức ý thức trách nhiệm và niềm khao khát hồi sinh.`,
        evidenceQuotes: [
          {
            id: 'ev-1',
            text: 'Người chết như ngả rạ... Giữa cái cảnh tối sầm lại vì đói khát ấy, một buổi chiều người trong xóm ngụ cư bỗng thấy Tràng dẫn một người đàn bà lạ về nhà.',
            pageOrParagraph: 'Đoạn 2'
          }
        ]
      },
      character_detail: {
        axisId: 'character_detail',
        analysisText: `Diễn biến tâm lý của Tràng và bà cụ Tứ được khắc họa sắc nét qua các chi tiết đắt giá:
1. Chi tiết "bát cháo cám": Nồi cháo cám đắng chát nghẹn ứ nơi cổ họng nhưng trong mắt người mẹ nghèo lại là "chè khoán". Chi tiết này bộc lộ tấm lòng vị tha, bao dung vô bờ bến của bà cụ Tứ nhằm nhen nhóm niềm vui và nghị lực cho các con trong ngày đầu dựng vợ gả chồng.
2. Chi tiết "nụ cười rạng rỡ của người xóm ngụ cư": Sự thấu cảm của những con người cùng chung cảnh ngộ, nụ cười làm bừng sáng cả xóm ngụ cư u ám.
3. Sự biến đổi của Tràng: Từ một anh chàng thô kệch trở thành người đàn ông trưởng thành, thấy mình "gắn bó và có bổn phận với cái nhà này".`,
        evidenceQuotes: [
          {
            id: 'ev-2',
            text: 'Bà lão vừa ăn vừa kể chuyện làm ăn, gia cảnh với con dâu: "Tràng ạ. Khi nào có tiền ta mua lấy đôi gà..."',
            pageOrParagraph: 'Cảnh bữa cơm sáng'
          },
          {
            id: 'ev-3',
            text: 'Bỗng nhiên hắn thấy hắn thương yêu gắn bó với cái nhà của hắn lạ lùng. Hắn đã có một gia đình. Hắn sẽ cùng vợ sinh con đẻ cái ở đấy.',
            pageOrParagraph: 'Buổi sáng sau đêm tân hôn'
          }
        ]
      },
      narrator_pov: {
        axisId: 'narrator_pov',
        analysisText: `Kim Lân sử dụng ngôi kể thứ ba nhưng có sự hòa trộn điểm nhìn trần thuật kỳ diệu. Người kể chuyện dường như lặn sâu vào ý thức nhân vật, dùng lời nửa trực tiếp để bộc lộ những rung cảm sâu kín nhất của bà cụ Tứ và Tràng.
Giọng điệu trần thuật vừa xót xa, nghẹn ngào trước thảm cảnh nạn đói, vừa ấm áp tin yêu khi dõi theo từng cử chỉ yêu thương của những con người nghèo khổ.`,
        evidenceQuotes: [
          {
            id: 'ev-4',
            text: 'Lòng người mẹ nghèo khổ ấy còn hiểu ra biết bao nhiêu điều, vừa mừng, vừa tủi, lại vừa thương...',
            pageOrParagraph: 'Tâm trạng bà cụ Tứ'
          }
        ]
      },
      space_time: {
        axisId: 'space_time',
        analysisText: `Không gian và thời gian nghệ thuật trong tác phẩm có sự vận động tương phản rõ rệt:
- Về Không gian: Khởi đầu bằng không gian "tối sầm lại vì đói khát", mùi ẩm thối của xác người, nhà cửa xơ xác; nhưng sau đó đã chuyển dịch sang không gian tươi sáng, sạch sẽ của buổi sáng hôm sau với tiếng chổi quét sân sàn sạt và hai ang nước đầy ắp.
- Về Thời gian: Chuyển động từ buổi chiều tà chạng vạng (thời khắc của sự tàn lụi, chết chóc) sang buổi sáng hôm sau tràn ngập ánh nắng mặt trời lên bằng con sào (thời khắc khởi đầu của một sự sống mới). Thời gian tâm lý mở ra dự cảm tương lai cách mạng với hình ảnh lá cờ đỏ sao vàng.`,
        evidenceQuotes: [
          {
            id: 'ev-5',
            text: 'Sáng hôm sau, mặt trời lên bằng con sào, Tràng mới trở dậy. Trong người êm ái lơ lửng như người vừa ở trong giấc mơ đi ra.',
            pageOrParagraph: 'Buổi sáng ngày mới'
          }
        ]
      },
      language_tone_symbol: {
        axisId: 'language_tone_symbol',
        analysisText: `Ngôn ngữ tác phẩm mộc mạc, đậm chất khẩu ngữ nông thôn Bắc Bộ (những từ ngữ xưng hô "u", "thầy", cách nói đùa tếu táo của Tràng).
Đặc biệt, hình ảnh lá cờ đỏ sao vàng bay phấp phới ở cuối truyện mang ý nghĩa biểu tượng sâu sắc: nó là ánh sáng chỉ đường cho những người nông dân cùng quẫn vùng lên tự giải phóng số phận.`,
        evidenceQuotes: [
          {
            id: 'ev-6',
            text: 'Trên đê Sộp, từng đoàn người kéo nhau đi phá kho thóc Nhật, phía trước có lá cờ đỏ sao vàng bay phấp phới...',
            pageOrParagraph: 'Kết truyện'
          }
        ]
      },
      form_argument: {
        axisId: 'form_argument',
        analysisText: `Tổng hợp lại, sự thống nhất giữa tình huống truyện độc đáo, không - thời gian tương phản, chi tiết giàu sức biểu cảm và điểm nhìn thấu cảm đã làm nên giá trị nhân đạo cao cả của tác phẩm: Kim Lân không miêu tả cái đói để làm con người tuyệt vọng, mà để ngợi ca vẻ đẹp của tình mẫu tử, tình vợ chồng và khát vọng sống mãnh liệt.`,
        evidenceQuotes: []
      }
    },
    versions: [
      {
        id: 'v1-an-vo-nhat',
        versionNumber: 'v1.0',
        createdAt: '2026-08-12T09:15:00Z',
        createdBy: 'user-std-1',
        authorName: 'Nguyễn Văn An',
        changeSummary: 'Bản nộp sơ thảo lần 1: Đã xác định được tình huống và tóm tắt nhân vật, chưa phân tích sâu không - thời gian và điểm nhìn.',
        isFrozen: true,
        isSubmitted: true,
        responses: {
          plot_situation: {
            axisId: 'plot_situation',
            analysisText: `Tình huống truyện "Vợ nhặt" là Tràng nhặt được vợ giữa nạn đói 1945 chỉ bằng bốn bát bánh đúc. Đây là tình huống rất lạ lùng và gây bất ngờ cho mọi người xung quanh làng xóm.`,
            evidenceQuotes: [
              {
                id: 'ev-v1-1',
                text: 'Tràng dẫn một người đàn bà lạ về nhà giữa ban ngày.',
                pageOrParagraph: 'Đoạn 2'
              }
            ]
          },
          character_detail: {
            axisId: 'character_detail',
            analysisText: `Nhân vật Tràng là một người nghèo, thô kệch nhưng rất tốt bụng. Bà cụ Tứ thì thương con, lo lắng nhưng cũng chấp nhận nàng dâu mới. Nồi cháo cám là chi tiết thể hiện sự nghèo đói của gia đình.`,
            evidenceQuotes: [
              {
                id: 'ev-v1-2',
                text: 'Bà cụ Tứ nghẹn ngào nhận dâu.',
                pageOrParagraph: 'Trang 3'
              }
            ]
          },
          narrator_pov: {
            axisId: 'narrator_pov',
            analysisText: `Tác giả Kim Lân dùng ngôi kể thứ ba để kể chuyện, lời kể khách quan và bày tỏ lòng thương cảm với số phận người nông dân nghèo.`,
            evidenceQuotes: []
          },
          space_time: {
            axisId: 'space_time',
            analysisText: `Truyện diễn ra vào buổi chiều chạng vạng khi Tràng dẫn vợ về và buổi sáng hôm sau khi hai vợ chồng dậy dọn dẹp nhà cửa.`,
            evidenceQuotes: []
          },
          language_tone_symbol: {
            axisId: 'language_tone_symbol',
            analysisText: `Ngôn ngữ giản dị của người nông thôn. Cuối truyện có nhắc tới lá cờ đỏ sao vàng.`,
            evidenceQuotes: []
          },
          form_argument: {
            axisId: 'form_argument',
            analysisText: `Truyện Vợ nhặt thể hiện tư tưởng nhân đạo sâu sắc của nhà văn Kim Lân đối với người nông dân nghèo trong nạn đói.`,
            evidenceQuotes: []
          }
        }
      },
      {
        id: 'v2-an-vo-nhat',
        versionNumber: 'v2.0',
        createdAt: '2026-08-16T15:40:00Z',
        createdBy: 'user-std-1',
        authorName: 'Nguyễn Văn An',
        changeSummary: 'Bản chỉnh sửa toàn diện v2.0: Đã tiếp thu nhận xét của Cô Mai về không gian - thời gian tương phản, bổ sung phân tích lời nửa trực tiếp và giải mã chi tiết bát cháo cám.',
        isFrozen: false,
        isSubmitted: true,
        responses: {
          plot_situation: {
            axisId: 'plot_situation',
            analysisText: `Tình huống truyện "Vợ nhặt" là một sáng tạo nghệ thuật độc đáo bậc nhất của Kim Lân. Đó là tình huống "nhặt vợ" vừa bi hài, vừa éo le nhưng lại chan chứa tình nhân ái. Giữa lúc nạn đói 1945 đang hoành hành dữ dội, người chết như ngả rạ, mạng người rẻ rúng như rơm rác, một người nông dân nghèo xấu xí lại "nhặt" được vợ chỉ bằng bốn bát bánh đúc và vài câu nói đùa.
Tình huống này mở ra 3 lớp bất ngờ: bất ngờ cho cả xóm ngụ cư, bất ngờ cho bà cụ Tứ người mẹ, và bất ngờ cho chính bản thân Tràng. Nhưng sâu xa hơn, tình huống này không đẩy con người vào vực thẳm bế tắc mà trở thành bước ngoặt đánh thức ý thức trách nhiệm và niềm khao khát hồi sinh.`,
            evidenceQuotes: [
              {
                id: 'ev-1',
                text: 'Người chết như ngả rạ... Giữa cái cảnh tối sầm lại vì đói khát ấy, một buổi chiều người trong xóm ngụ cư bỗng thấy Tràng dẫn một người đàn bà lạ về nhà.',
                pageOrParagraph: 'Đoạn 2'
              }
            ]
          },
          character_detail: {
            axisId: 'character_detail',
            analysisText: `Diễn biến tâm lý của Tràng và bà cụ Tứ được khắc họa sắc nét qua các chi tiết đắt giá:
1. Chi tiết "bát cháo cám": Nồi cháo cám đắng chát nghẹn ứ nơi cổ họng nhưng trong mắt người mẹ nghèo lại là "chè khoán". Chi tiết này bộc lộ tấm lòng vị tha, bao dung vô bờ bến của bà cụ Tứ nhằm nhen nhóm niềm vui và nghị lực cho các con trong ngày đầu dựng vợ gả chồng.
2. Chi tiết "nụ cười rạng rỡ của người xóm ngụ cư": Sự thấu cảm của những con người cùng chung cảnh ngộ, nụ cười làm bừng sáng cả xóm ngụ cư u ám.
3. Sự biến đổi của Tràng: Từ một anh chàng thô kệch trở thành người đàn ông trưởng thành, thấy mình "gắn bó và có bổn phận với cái nhà này".`,
            evidenceQuotes: [
              {
                id: 'ev-2',
                text: 'Bà lão vừa ăn vừa kể chuyện làm ăn, gia cảnh với con dâu: "Tràng ạ. Khi nào có tiền ta mua lấy đôi gà..."',
                pageOrParagraph: 'Cảnh bữa cơm sáng'
              },
              {
                id: 'ev-3',
                text: 'Bỗng nhiên hắn thấy hắn thương yêu gắn bó với cái nhà của hắn lạ lùng. Hắn đã có một gia đình. Hắn sẽ cùng vợ sinh con đẻ cái ở đấy.',
                pageOrParagraph: 'Buổi sáng sau đêm tân hôn'
              }
            ]
          },
          narrator_pov: {
            axisId: 'narrator_pov',
            analysisText: `Kim Lân sử dụng ngôi kể thứ ba nhưng có sự hòa trộn điểm nhìn trần thuật kỳ diệu. Người kể chuyện dường như lặn sâu vào ý thức nhân vật, dùng lời nửa trực tiếp để bộc lộ những rung cảm sâu kín nhất của bà cụ Tứ và Tràng.
Giọng điệu trần thuật vừa xót xa, nghẹn ngào trước thảm cảnh nạn đói, vừa ấm áp tin yêu khi dõi theo từng cử chỉ yêu thương của những con người nghèo khổ.`,
            evidenceQuotes: [
              {
                id: 'ev-4',
                text: 'Lòng người mẹ nghèo khổ ấy còn hiểu ra biết bao nhiêu điều, vừa mừng, vừa tủi, lại vừa thương...',
                pageOrParagraph: 'Tâm trạng bà cụ Tứ'
              }
            ]
          },
          space_time: {
            axisId: 'space_time',
            analysisText: `Không gian và thời gian nghệ thuật trong tác phẩm có sự vận động tương phản rõ rệt:
- Về Không gian: Khởi đầu bằng không gian "tối sầm lại vì đói khát", mùi ẩm thối của xác người, nhà cửa xơ xác; nhưng sau đó đã chuyển dịch sang không gian tươi sáng, sạch sẽ của buổi sáng hôm sau với tiếng chổi quét sân sàn sạt và hai ang nước đầy ắp.
- Về Thời gian: Chuyển động từ buổi chiều tà chạng vạng (thời khắc của sự tàn lụi, chết chóc) sang buổi sáng hôm sau tràn ngập ánh nắng mặt trời lên bằng con sào (thời khắc khởi đầu của một sự sống mới). Thời gian tâm lý mở ra dự cảm tương lai cách mạng với hình ảnh lá cờ đỏ sao vàng.`,
            evidenceQuotes: [
              {
                id: 'ev-5',
                text: 'Sáng hôm sau, mặt trời lên bằng con sào, Tràng mới trở dậy. Trong người êm ái lơ lửng như người vừa ở trong giấc mơ đi ra.',
                pageOrParagraph: 'Buổi sáng ngày mới'
              }
            ]
          },
          language_tone_symbol: {
            axisId: 'language_tone_symbol',
            analysisText: `Ngôn ngữ tác phẩm mộc mạc, đậm chất khẩu ngữ nông thôn Bắc Bộ (những từ ngữ xưng hô "u", "thầy", cách nói đùa tếu táo của Tràng).
Đặc biệt, hình ảnh lá cờ đỏ sao vàng bay phấp phới ở cuối truyện mang ý nghĩa biểu tượng sâu sắc: nó là ánh sáng chỉ đường cho những người nông dân cùng quẫn vùng lên tự giải phóng số phận.`,
            evidenceQuotes: [
              {
                id: 'ev-6',
                text: 'Trên đê Sộp, từng đoàn người kéo nhau đi phá kho thóc Nhật, phía trước có lá cờ đỏ sao vàng bay phấp phới...',
                pageOrParagraph: 'Kết truyện'
              }
            ]
          },
          form_argument: {
            axisId: 'form_argument',
            analysisText: `Tổng hợp lại, sự thống nhất giữa tình huống truyện độc đáo, không - thời gian tương phản, chi tiết giàu sức biểu cảm và điểm nhìn thấu cảm đã làm nên giá trị nhân đạo cao cả của tác phẩm: Kim Lân không miêu tả cái đói để làm con người tuyệt vọng, mà để ngợi ca vẻ đẹp của tình mẫu tử, tình vợ chồng và khát vọng sống mãnh liệt.`,
            evidenceQuotes: []
          }
        }
      }
    ]
  }
};

export const MOCK_FEEDBACK_ITEMS: FeedbackItem[] = [
  {
    id: 'fb-1',
    assignmentId: 'assign-vo-nhat',
    studentId: 'user-std-1',
    versionNumber: 'v1.0',
    axisId: 'space_time',
    selectedSnippet: 'Truyện diễn ra vào buổi chiều chạng vạng khi Tràng dẫn vợ về và buổi sáng hôm sau khi hai vợ chồng dậy dọn dẹp nhà cửa.',
    comment: 'Em mới chỉ ghi nhận mốc thời gian vật lý. Hãy chú ý sự đối lập nghệ thuật: Chiều tạng vạng (bóng tối nạn đói) đối lập với Ánh nắng sáng mùa hè hôm sau (sự hồi sinh). Cần bổ sung ý nghĩa của sự chuyển biến này.',
    authorId: 'user-teacher-1',
    authorName: 'Cô Nguyễn Thị Mai',
    authorRole: 'teacher',
    createdAt: '2026-08-13T10:00:00Z',
    resolved: true
  },
  {
    id: 'fb-2',
    assignmentId: 'assign-vo-nhat',
    studentId: 'user-std-1',
    versionNumber: 'v1.0',
    axisId: 'character_detail',
    selectedSnippet: 'Nồi cháo cám là chi tiết thể hiện sự nghèo đói của gia đình.',
    comment: 'Chi tiết "bát cháo cám" không chỉ là cái đói, mà cốt lõi là tấm lòng của bà mẹ: bà gọi là "chè khoán ngon đáo để" để xua đi không khí u ám. Em hãy phân tích chiều sâu tâm lý này nhé!',
    authorId: 'user-teacher-1',
    authorName: 'Cô Nguyễn Thị Mai',
    authorRole: 'teacher',
    createdAt: '2026-08-13T10:15:00Z',
    resolved: true
  },
  {
    id: 'fb-3',
    assignmentId: 'assign-vo-nhat',
    studentId: 'user-std-1',
    versionNumber: 'v1.0',
    axisId: 'narrator_pov',
    selectedSnippet: 'tác giả Kim Lân dùng ngôi kể thứ ba để kể chuyện, lời kể khách quan',
    comment: 'An chú ý thêm hiện tượng "lời nửa trực tiếp" nhé. Kim Lân đã hòa lẫn giọng của tác giả vào dòng suy nghĩ "vừa mừng vừa tủi" của bà cụ Tứ rất đặc sắc.',
    authorId: 'user-peer-1',
    authorName: 'Trần Thị Bình (Bạn học)',
    authorRole: 'peer',
    createdAt: '2026-08-14T08:30:00Z',
    resolved: true
  },
  {
    id: 'fb-demo-songchau-1',
    assignmentId: 'assign-song-chau',
    studentId: 'HS-DEMO-01',
    versionNumber: 'v1.0',
    axisId: 'narrator_pov',
    selectedSnippet: 'Người kể chuyện ngôi thứ ba toàn tri quan sát số phận dì Mây khi trở về sau chiến tranh...',
    comment: 'Em đã xác định đúng điểm nhìn nhưng cần lí giải việc chuyển điểm nhìn tạo ra thay đổi gì trong nhận thức của người đọc.',
    authorId: 'user-teacher-1',
    authorName: 'Cô Nguyễn Thị Mai',
    authorRole: 'teacher',
    createdAt: '2026-08-15T09:15:00Z',
    resolved: true
  }
];

export const MOCK_RUBRIC_SUBMISSIONS: RubricAssessmentSubmission[] = [
  {
    id: 'sub-self-v1',
    assignmentId: 'assign-vo-nhat',
    studentId: 'user-std-1',
    versionNumber: 'v1.0',
    evaluatorId: 'user-std-1',
    evaluatorName: 'Nguyễn Văn An (Tự đánh giá)',
    evaluatorRole: 'student',
    criterionScores: {
      'crit-plot': { level: 2, score: 2.0, note: 'Em mới chỉ nêu được tình huống chung.' },
      'crit-char': { level: 2, score: 2.0, note: 'Chưa phân tích kỹ chi tiết bát cháo cám.' },
      'crit-pov': { level: 1, score: 1.0, note: 'Chưa chỉ ra được điểm nhìn nửa trực tiếp.' },
      'crit-spacetime': { level: 1, score: 1.0, note: 'Chưa viết sâu về thời gian tâm trạng.' },
      'crit-lang': { level: 2, score: 2.0, note: 'Có nhận diện ngôn ngữ nông thôn.' },
      'crit-synthesis': { level: 2, score: 2.0, note: 'Đã rút ra chủ đề nhân đạo.' }
    },
    overallFeedback: 'Em thấy bản v1.0 của mình còn sơ sài ở trục Không gian - thời gian và Điểm nhìn trần thuật.',
    totalScore: 10.0,
    maxScore: 24.0,
    submittedAt: '2026-08-12T09:30:00Z'
  },
  {
    id: 'sub-teacher-v1',
    assignmentId: 'assign-vo-nhat',
    studentId: 'user-std-1',
    versionNumber: 'v1.0',
    evaluatorId: 'user-teacher-1',
    evaluatorName: 'Cô Nguyễn Thị Mai',
    evaluatorRole: 'teacher',
    criterionScores: {
      'crit-plot': { level: 2, score: 2.0, note: 'Nêu đúng tình huống nhưng chưa khai thác 3 tầng bất ngờ.' },
      'crit-char': { level: 2, score: 2.0, note: 'Cần khai thác thêm chi tiết nụ cười và giọt nước mắt bà mẹ.' },
      'crit-pov': { level: 1, score: 1.0, note: 'Chưa nhận diện sự thấu cảm và lời nửa trực tiếp.' },
      'crit-spacetime': { level: 1, score: 1.0, note: 'Yếu: chưa nhận ra sự tương phản không gian sáng/tối.' },
      'crit-lang': { level: 2, score: 2.0, note: 'Cần phân tích biểu tượng lá cờ đỏ sao vàng.' },
      'crit-synthesis': { level: 2, score: 2.0, note: 'Lập luận còn mỏng dẫn chứng.' }
    },
    overallFeedback: 'Bài làm bước đầu nắm được cốt truyện. Cô đã để lại các ghi chú neo ở trục 3 và trục 4. An hãy đọc kỹ và hoàn thiện bản v2.0 nhé!',
    totalScore: 10.0,
    maxScore: 24.0,
    submittedAt: '2026-08-13T10:30:00Z'
  },
  {
    id: 'sub-teacher-v2',
    assignmentId: 'assign-vo-nhat',
    studentId: 'user-std-1',
    versionNumber: 'v2.0',
    evaluatorId: 'user-teacher-1',
    evaluatorName: 'Cô Nguyễn Thị Mai',
    evaluatorRole: 'teacher',
    criterionScores: {
      'crit-plot': { level: 4, score: 4.0, note: 'Phân tích 3 lớp bất ngờ rất sâu sắc và thuyết phục.' },
      'crit-char': { level: 4, score: 4.0, note: 'Giải mã chi tiết bát cháo cám và tấm lòng bà cụ Tứ rất tinh tế.' },
      'crit-pov': { level: 3, score: 3.0, note: 'Đã chỉ ra rõ nét lời nửa trực tiếp và điểm nhìn thấu cảm.' },
      'crit-spacetime': { level: 4, score: 4.0, note: 'Tiến bộ vượt bậc: phân tích đối lập không gian sáng/tối và thời gian tâm lý xuất sắc!' },
      'crit-lang': { level: 3, score: 3.0, note: 'Phân tích biểu tượng lá cờ đỏ sao vàng mạch lạc.' },
      'crit-synthesis': { level: 4, score: 4.0, note: 'Lập luận giàu tính thuyết phục, văn phong truyền cảm.' }
    },
    overallFeedback: 'Tiến bộ vượt bậc giữa v1.0 và v2.0! Em đã tiếp thu trọn vẹn phản hồi của cô và bạn học. Điểm sáng lớn nhất là sự chuyển hóa ở trục Không gian - thời gian.',
    totalScore: 22.0,
    maxScore: 24.0,
    submittedAt: '2026-08-17T09:00:00Z'
  }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-08-18T07:30:15Z',
    actorName: 'Nguyễn Văn An',
    actorRole: 'student',
    action: 'SAVE_DRAFT',
    target: 'Hồ sơ đọc: Vợ nhặt (assign-vo-nhat)',
    ipAddress: '192.168.1.45'
  },
  {
    id: 'log-2',
    timestamp: '2026-08-17T09:00:12Z',
    actorName: 'Cô Nguyễn Thị Mai',
    actorRole: 'teacher',
    action: 'SUBMIT_RUBRIC_GRADE',
    target: 'Chấm Rubric v2.0 cho học sinh Nguyễn Văn An (22/24 điểm)',
    ipAddress: '192.168.1.10'
  },
  {
    id: 'log-3',
    timestamp: '2026-08-16T15:40:05Z',
    actorName: 'Nguyễn Văn An',
    actorRole: 'student',
    action: 'CREATE_VERSION_SNAPSHOT',
    target: 'Tạo snapshot phiên bản v2.0 cho bài Vợ nhặt',
    ipAddress: '192.168.1.45'
  },
  {
    id: 'log-4',
    timestamp: '2026-08-13T10:15:30Z',
    actorName: 'Cô Nguyễn Thị Mai',
    actorRole: 'teacher',
    action: 'ADD_ANCHORED_FEEDBACK',
    target: 'Neo nhận xét vào đoạn văn bản v1.0 (trục Nhân vật - Chi tiết)',
    ipAddress: '192.168.1.10'
  }
];
