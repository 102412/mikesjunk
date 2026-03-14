// Smooth scrolling
document.querySelectorAll('nav a').forEach(anchor => {
  anchor.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector(anchor.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    });
  });
});

// Floating blobs movement on mouse move
const blobs = document.querySelectorAll('.blobs .blob');
document.addEventListener('mousemove', e => {
  blobs.forEach((blob, i) => {
    const speed = (i + 1) * 0.03;
    const x = (window.innerWidth / 2 - e.pageX) * speed;
    const y = (window.innerHeight / 2 - e.pageY) * speed;
    blob.style.transform = `translate(${x}px, ${y}px) scale(1.1)`;
  });
});

// Form submission (dummy)
document.getElementById('contactForm').addEventListener('submit', e => {
  e.preventDefault();
  alert('Thanks for reaching out! Mike will contact you soon.');
});
