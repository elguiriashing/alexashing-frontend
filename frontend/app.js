// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Custom Cursor
const cursor = document.querySelector('.cursor');
const links = document.querySelectorAll('a, button, .service-item, .contact-title');

let lastRippleTime = 0;

document.addEventListener('mousemove', (e) => {
  gsap.to(cursor, {
    x: e.clientX,
    y: e.clientY,
    duration: 0.1,
    ease: "power2.out"
  });

  const now = Date.now();
  if (now - lastRippleTime > 40) {
    createRipple(e.clientX, e.clientY);
    lastRippleTime = now;
  }
});

function createRipple(x, y) {
  const ripple = document.createElement('div');
  ripple.className = 'ripple';
  document.body.appendChild(ripple);
  
  gsap.set(ripple, { x: x, y: y, scale: 0.5, opacity: 0.8 });
  gsap.to(ripple, {
    scale: 2.5,
    opacity: 0,
    duration: 1.2,
    ease: "power2.out",
    onComplete: () => ripple.remove()
  });
}

links.forEach(link => {
  link.addEventListener('mouseenter', () => cursor.classList.add('active'));
  link.addEventListener('mouseleave', () => cursor.classList.remove('active'));
});

// Prevent scrolling during loader
document.body.style.overflow = 'hidden';

// Loader Animation
const tlLoader = gsap.timeline({
  onComplete: () => {
    document.body.style.overflow = '';
  }
});

tlLoader.from(".loader-text", {
  y: 100,
  opacity: 0,
  duration: 1,
  ease: "power4.out"
})
.to(".loader-text", {
  y: -100,
  opacity: 0,
  duration: 0.8,
  ease: "power4.in",
  delay: 0.5
})
.to(".loader", {
  yPercent: -100,
  duration: 1,
  ease: "power4.inOut"
}, "-=0.2")
.from(".hero-title", {
  y: 100,
  opacity: 0,
  duration: 1.5,
  ease: "power4.out",
  stagger: 0.2
}, "-=0.5")
.from(".laser", {
  scaleX: 0,
  duration: 1,
  ease: "power4.out"
}, "-=1")
.from(".nav-links a, .logo", {
  y: -20,
  opacity: 0,
  duration: 1,
  stagger: 0.1,
  ease: "power3.out"
}, "-=1");

// Ethos Reveal
gsap.from(".ethos h2", {
  scrollTrigger: {
    trigger: ".ethos",
    start: "top 80%",
  },
  y: 50,
  opacity: 0,
  duration: 1.5,
  ease: "power3.out"
});

// Services Reveal
gsap.from(".service-item", {
  scrollTrigger: {
    trigger: ".services",
    start: "top 70%",
  },
  x: -50,
  opacity: 0,
  duration: 1,
  stagger: 0.2,
  ease: "power3.out"
});

// Showreel Hover Cursor Logic
const showreelText = document.querySelector('.showreel-text');
if(showreelText) {
  showreelText.addEventListener('mouseenter', () => {
    cursor.classList.add('active');
  });
  showreelText.addEventListener('mouseleave', () => {
    cursor.classList.remove('active');
  });
}

// Stats Counter
const stats = document.querySelectorAll('.stat-number');
if(stats.length > 0) {
  ScrollTrigger.create({
    trigger: ".stats",
    start: "top 80%",
    once: true,
    onEnter: () => {
      stats.forEach(stat => {
        const target = +stat.getAttribute('data-target');
        gsap.to(stat, {
          innerHTML: target,
          duration: 2,
          snap: { innerHTML: 1 },
          ease: "power2.out"
        });
      });
    }
  });
}

// Pipeline Split Scroll
const pipelineSteps = gsap.utils.toArray('.pipeline-step');
if (pipelineSteps.length > 0) {
  ScrollTrigger.create({
    trigger: ".pipeline",
    start: "top top",
    end: "+=300%",
    pin: true
  });

  // Animate the right side scrolling up relative to the container
  gsap.to(".pipeline-right", {
    y: () => -(document.querySelector('.pipeline-right').scrollHeight - window.innerHeight),
    ease: "none",
    scrollTrigger: {
      trigger: ".pipeline",
      start: "top top",
      end: "+=300%",
      scrub: 1
    }
  });

  // Highlight active steps
  pipelineSteps.forEach((step, i) => {
    ScrollTrigger.create({
      trigger: step,
      start: "top center",
      end: "bottom center",
      toggleClass: "active"
    });
  });
}

// Horizontal Scroll for Work
const workWrapper = document.querySelector('.work-wrapper');
if (workWrapper) {
  let scrollTween = gsap.to(workWrapper, {
    x: () => -(workWrapper.scrollWidth - document.documentElement.clientWidth),
    ease: "none",
    scrollTrigger: {
      trigger: ".work",
      pin: true,
      scrub: 1.5,
      start: "top top",
      end: () => "+=" + workWrapper.scrollWidth,
      invalidateOnRefresh: true
    }
  });

  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
  });
}

// Contact Section
gsap.from(".contact-title", {
  scrollTrigger: {
    trigger: ".contact",
    start: "top 80%"
  },
  scale: 0.8,
  opacity: 0,
  duration: 1.5,
  ease: "elastic.out(1, 0.3)"
});

// 5. Arsenal Parallax
const arsenalItems = gsap.utils.toArray('.arsenal-item');
if(arsenalItems.length > 0) {
  arsenalItems.forEach(item => {
    const speed = item.getAttribute('data-speed');
    gsap.to(item, {
      y: -100 * speed,
      ease: "none",
      scrollTrigger: {
        trigger: ".arsenal",
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });
  });
}

// 6. Contact Section Cursor
const contactTitle = document.querySelector('.contact-title');
if(contactTitle) {
  contactTitle.addEventListener('mouseenter', () => {
    cursor.classList.add('active');
  });
  contactTitle.addEventListener('mouseleave', () => {
    cursor.classList.remove('active');
  });
}

// Smooth Scroll for Nav Links
const nav = document.querySelector('nav');
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navHeight = nav ? nav.offsetHeight : 0;
            window.scrollTo({
                top: target.offsetTop - navHeight,
                behavior: 'smooth'
            });
        }
    });
});
