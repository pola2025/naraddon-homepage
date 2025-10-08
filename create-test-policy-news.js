// 정책소식 테스트 데이터 생성 스크립트
const testHtmlContent = `
<h2>2025년 청년 창업 지원 정책 완벽 가이드</h2>
<p>정부에서는 청년 창업가들을 위한 다양한 지원 정책을 시행하고 있습니다. 이번 글에서는 2025년에 시행되는 주요 청년 창업 지원 정책을 자세히 알아보겠습니다.</p>

<h3>1. 창업자금 지원 프로그램</h3>
<p>청년 창업가들에게 가장 중요한 것 중 하나가 바로 <strong>초기 자금</strong>입니다. 정부는 다음과 같은 금융 지원을 제공합니다:</p>

<ul>
    <li><strong>청년 전용 창업자금:</strong> 최대 1억원까지 연 2%의 저금리로 대출 가능</li>
    <li><strong>무담보 신용대출:</strong> 신용등급에 따라 최대 5천만원까지 지원</li>
    <li><strong>크라우드펀딩 매칭:</strong> 크라우드펀딩 성공 시 정부가 1:1 매칭 투자</li>
</ul>

<blockquote>
    "청년 창업은 대한민국 경제의 미래입니다. 우리는 젊은 창업가들의 도전을 적극 지원하겠습니다." - 중소벤처기업부 장관
</blockquote>

<h3>2. 사무공간 지원</h3>
<p>창업 초기 가장 큰 부담 중 하나인 사무실 임대료를 지원합니다:</p>

<table>
    <thead>
        <tr>
            <th>지원 유형</th>
            <th>지원 내용</th>
            <th>지원 기간</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>공유 오피스</td>
            <td>월 임대료 80% 지원</td>
            <td>최대 12개월</td>
        </tr>
        <tr>
            <td>창업보육센터</td>
            <td>무료 입주</td>
            <td>최대 24개월</td>
        </tr>
        <tr>
            <td>청년창업사관학교</td>
            <td>전액 무료 + 활동비 지원</td>
            <td>12개월</td>
        </tr>
    </tbody>
</table>

<h3>3. 멘토링 및 교육 프로그램</h3>
<p>성공적인 창업을 위한 전문가 멘토링과 교육을 제공합니다:</p>

<ol>
    <li><strong>1:1 전담 멘토 배정:</strong> 업종별 전문가와 매칭</li>
    <li><strong>창업 교육 프로그램:</strong> 온/오프라인 무료 교육</li>
    <li><strong>네트워킹 행사:</strong> 월 1회 창업가 교류 행사</li>
    <li><strong>해외 진출 컨설팅:</strong> 글로벌 시장 진출 지원</li>
</ol>

<div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h4 style="color: #059669;">💡 신청 Tip</h4>
    <p>모든 지원사업은 <a href="https://www.k-startup.go.kr">K-스타트업 포털</a>에서 통합 신청할 수 있습니다. 사업계획서는 미리 준비하시면 신청이 더욱 수월합니다.</p>
</div>

<h3>4. 세제 혜택</h3>
<p>청년 창업기업에는 다음과 같은 <mark>세금 감면 혜택</mark>이 제공됩니다:</p>

<pre><code>// 세금 감면율 계산 예시
창업 후 경과 연수 | 감면율
1~3년차         | 75% 감면
4~5년차         | 50% 감면
</code></pre>

<h3>5. 신청 방법 및 일정</h3>
<p>2025년 청년 창업 지원사업 신청 일정은 다음과 같습니다:</p>

<ul>
    <li><strong>1차 모집:</strong> 2025년 2월 1일 ~ 2월 28일</li>
    <li><strong>2차 모집:</strong> 2025년 6월 1일 ~ 6월 30일</li>
    <li><strong>3차 모집:</strong> 2025년 10월 1일 ~ 10월 31일</li>
</ul>

<hr />

<p><strong>문의처:</strong> 청년창업지원센터 ☎ 1357 | <a href="mailto:startup@kodit.co.kr">startup@kodit.co.kr</a></p>

<p><em>※ 본 내용은 2025년 1월 기준이며, 정책 변경에 따라 일부 내용이 수정될 수 있습니다.</em></p>
`;

// API 호출 함수
async function createTestPost() {
    try {
        const response = await fetch('http://localhost:3002/api/policy-news', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: '2025년 청년 창업 지원 정책 완벽 가이드',
                content: testHtmlContent,
                category: '창업지원',
                excerpt: '청년 창업가를 위한 정부 지원 정책을 한눈에! 창업자금, 사무실, 멘토링까지 다양한 혜택을 확인하세요.',
                thumbnail: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800',
                tags: ['청년창업', '정부지원', '창업자금', 'K-스타트업', '2025년'],
                isMain: true,
                isPinned: false,
                badge: 'NEW'
            })
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ 테스트 게시글 생성 성공!');
            console.log('게시글 ID:', result.post._id);
            console.log('URL: http://localhost:3002/policy-news/' + result.post._id);
        } else {
            console.error('❌ 생성 실패:', result.message);
        }
    } catch (error) {
        console.error('❌ 오류 발생:', error);
    }
}

// 스크립트 실행
createTestPost();