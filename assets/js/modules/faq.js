/* HorgosCPA — FAQ: fetch + accordion + FAQPage schema */

function injectFAQSchema(data) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: data.map(item => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer
            }
        }))
    }, null, 2);
    document.head.appendChild(script);
}

export function initFAQ() {
    const faqContainer = document.getElementById('faq-container-list');
    if (!faqContainer) return;

    fetch('/assets/data/faq.json')
        .then(response => {
            if (!response.ok) throw new Error('network');
            return response.json();
        })
        .then(data => {
            faqContainer.innerHTML = '';

            if (data.length === 0) {
                faqContainer.innerHTML = '<p class="text-muted" style="text-align:center;">目前沒有常見問題資料。</p>';
                return;
            }

            // Inject FAQPage schema for SEO
            injectFAQSchema(data);

            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'faq-item';

                const title = document.createElement('h3');
                title.className = 'faq-question';
                title.textContent = item.question;

                const content = document.createElement('p');
                content.className = 'faq-answer';
                content.textContent = item.answer;

                div.appendChild(title);
                div.appendChild(content);
                faqContainer.appendChild(div);

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
            const msg = document.createElement('p');
            msg.className = 'text-muted';
            msg.style.textAlign = 'center';
            msg.textContent = '目前無法載入常見問題，請稍後再試。';
            faqContainer.appendChild(msg);
        });
}
