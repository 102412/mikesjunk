// Smooth scrolling
document.querySelectorAll('nav a').forEach(anchor => {
  anchor.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector(anchor.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    });
  });
});

// Floating boxes movement on mouse move
const boxes = document.querySelectorAll('.floating-boxes .box');
document.addEventListener('mousemove', e => {
  boxes.forEach((box, i) => {
    const speed = (i + 1) * 0.05;
    const x = (window.innerWidth / 2 - e.pageX) * speed;
    const y = (window.innerHeight / 2 - e.pageY) * speed;
    box.style.transform = `translate(${x}px, ${y}px) rotate(${performance.now()/50}deg)`;
  });
});

// Form submission (dummy)
document.getElementById('contactForm').addEventListener('submit', e => {
  e.preventDefault();
  alert('Thanks for reaching out! Mike will contact you soon.');
});
