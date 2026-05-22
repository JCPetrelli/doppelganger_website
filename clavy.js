// Clavy page: expandable production videos in the Selected Work section.
// Each work header toggles a panel; the YouTube iframe is created on open and
// removed on close so the video stops playing when the panel collapses.
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#work .work-item').forEach((item) => {
        const header = item.querySelector('.work-header');
        const embed = item.querySelector('.video-embed');
        if (!header || !embed || !embed.dataset.src) return;

        const toggle = () => {
            const isOpen = item.classList.toggle('open');
            header.setAttribute('aria-expanded', String(isOpen));

            if (isOpen) {
                const iframe = document.createElement('iframe');
                iframe.src = embed.dataset.src;
                iframe.title = item.querySelector('.work-title').textContent.trim();
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
                iframe.allowFullscreen = true;
                embed.appendChild(iframe);
            } else {
                embed.replaceChildren();
            }
        };

        header.addEventListener('click', toggle);
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
            }
        });
    });
});
