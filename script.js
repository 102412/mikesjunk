// Smooth scrolling
document.querySelectorAll('nav a').forEach(anchor => {
  anchor.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector(anchor.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    });
  });
});

// Mobile menu toggle
const menuToggle = document.getElementById('menu-toggle');
const navMenu = document.querySelector('header nav ul');
menuToggle.addEventListener('click', () => {
  navMenu.classList.toggle('show');
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

// Scroll-triggered animations
const scrollElements = document.querySelectorAll('.scroll-fade, .scroll-slide-left, .scroll-slide-right, .scroll-slide-up');

const elementInView = (el, offset = 0) => {
  const elementTop = el.getBoundingClientRect().top;
  return (
    elementTop <= (window.innerHeight || document.documentElement.clientHeight) - offset
  );
};

const displayScrollElement = (element) => {
  element.classList.add('scroll-in-view');
};

const hideScrollElement = (element) => {
  element.classList.remove('scroll-in-view');
};

const handleScrollAnimation = () => {
  scrollElements.forEach(el => {
    if (elementInView(el, 100)) {
      displayScrollElement(el);
    } 
  })
}

window.addEventListener('scroll', () => {
  handleScrollAnimation();
});

// Form submission (dummy)
document.getElementById('contactForm').addEventListener('submit', e => {
  e.preventDefault();
  alert('Thanks for reaching out! Mike will contact you soon.');
});
