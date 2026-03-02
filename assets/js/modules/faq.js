/* HorgosCPA — FAQ: fetch + accordion */

export function initFAQ() {
    const faqContainer = document.getElementById('faq-container-list');
    if (!faqContainer) return;

    fetch('/assets/data/faq.json')
        .then(response => response.json())
        .then(data => {
            faqContainer.innerHTML = '';

            if (data.length === 0) {
                faqContainer.innerHTML = '<p class="text-muted" style="text-align:center;">目前沒有常見問題資料。</p>';
                return;
            }

            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'faq-item';

                div.innerHTML = `
                    <h3 class="faq-question">${item.question}</h3>
                    <p class="faq-answer">${item.answer}</p>
                `;
                faqContainer.appendChild(div);

                const title = div.querySelector('.faq-question');
                const content = div.querySelector('.faq-answer');

                title.addEventListener('click', () => {
                    // Close others
                    document.querySelectorAll('.faq-answer').forEach(p => {
                        if (p !== content) {
                            p.classList.remove('open');
                            p.previousElementSibling.classList.remove('active');
                        }
                    });
                    // Toggle current
                    content.classList.toggle('open');
                    title.classList.toggle('active');
                });
            });
        })
        .catch(err => {
            console.error('Failed to load FAQ:', err);
            faqContainer.innerHTML = '<p class="text-error" style="text-align:center;">無法載入常見問題。</p>';
        });
}
