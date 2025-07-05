// Vanilla Carousel Demo Implementation
document.addEventListener('DOMContentLoaded', function () {

  // Basic Carousel with seamless loop and autoplay
  const basicCarousel = new VanillaCarousel('#basic-carousel', {
    loop: true,
    autoplay: true,
    autoplayDelay: 4000,
    speed: 600,
    grabCursor: true,
    keyboard: true,
    navigation: {
      nextEl: '#basic-next',
      prevEl: '#basic-prev',
    },
    pagination: {
      el: '#basic-pagination',
      type: 'bullets',
      clickable: true,
    },
    on: {
      slideChange: function (data) {
        console.log('Basic carousel changed to slide', data.realIndex + 1);
      }
    }
  });

  // Make basicCarousel global for button controls
  window.basicCarousel = basicCarousel;

  // Multiple slides per view with responsive breakpoints and seamless loop
  const multiCarousel = new VanillaCarousel('#multi-carousel', {
    slidesPerView: 3,
    spaceBetween: 20,
    loop: true,
    grabCursor: true,
    autoplay: true,
    autoplayDelay: 4000,
    speed: 600,
    navigation: {
      nextEl: '#multi-next',
      prevEl: '#multi-prev',
    },
    pagination: {
      el: '#multi-pagination',
      type: 'bullets',
      clickable: true,
    },
    breakpoints: {
      320: {
        slidesPerView: 1,
        spaceBetween: 10
      },
      640: {
        slidesPerView: 2,
        spaceBetween: 15
      },
      1024: {
        slidesPerView: 3,
        spaceBetween: 20
      }
    },
    on: {
      slideChange: function (data) {
        console.log('Multi carousel changed to slide', data.realIndex + 1);
      }
    }
  });

  // Image carousel with thumbnails and seamless loop
  const imageCarousel = new VanillaCarousel('#image-carousel', {
    loop: true,
    speed: 500,
    grabCursor: true,
    navigation: {
      nextEl: '#image-next',
      prevEl: '#image-prev',
    },
    on: {
      slideChange: function (data) {
        updateThumbnails(data.realIndex);
      }
    }
  });

  // Thumbnail functionality
  function updateThumbnails(activeIndex) {
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach((thumb, index) => {
      thumb.classList.toggle('active', index === activeIndex);
    });
  }

  // Thumbnail click handlers
  document.getElementById('thumbnails').addEventListener('click', function (e) {
    const thumbnail = e.target.closest('.thumbnail');
    if (thumbnail) {
      const slideIndex = parseInt(thumbnail.dataset.slide);
      imageCarousel.slideTo(slideIndex);
    }
  });

  // Vertical carousel with seamless loop
  const verticalCarousel = new VanillaCarousel('#vertical-carousel', {
    direction: 'vertical',
    loop: true,
    autoplay: true,
    autoplayDelay: 3000,
    speed: 800,
    grabCursor: true,
    keyboard: true,
    pagination: {
      el: '#vertical-pagination',
      type: 'fraction',
    }
  });

  // Fade effect carousel with seamless loop
  const fadeCarousel = new VanillaCarousel('#fade-carousel', {
    effect: 'fade',
    loop: true,
    autoplay: true,
    autoplayDelay: 2500,
    speed: 1000,
    pagination: {
      el: '#fade-pagination',
      type: 'bullets',
      clickable: true,
    }
  });

  // Progress bar carousel with seamless loop
  const progressCarousel = new VanillaCarousel('#progress-carousel', {
    loop: true,
    autoplay: true,
    autoplayDelay: 3500,
    speed: 700,
    grabCursor: true,
    pagination: {
      el: '#progress-pagination',
      type: 'progressbar',
    }
  });

  // Demonstration of API methods
  console.log('Carousel instances created successfully!');
  console.log('All carousels now support seamless infinite scrolling!');

  // Example of using events
  basicCarousel.container.addEventListener('carousel:slideChange', function (e) {
    console.log('Custom event fired:', e.detail);
  });

  // Keyboard shortcuts for demonstration (global)
  document.addEventListener('keydown', function (e) {
    // Only if no input is focused
    if (document.activeElement.tagName.toLowerCase() === 'input') return;

    switch (e.key) {
      case '1':
        basicCarousel.slideTo(0);
        break;
      case '2':
        basicCarousel.slideTo(1);
        break;
      case '3':
        basicCarousel.slideTo(2);
        break;
      case 'p':
        if (basicCarousel.autoplayTimer) {
          basicCarousel.pauseAutoplay();
          console.log('Autoplay paused');
        } else {
          basicCarousel.startAutoplay();
          console.log('Autoplay started');
        }
        break;
    }
  });

  // Touch feedback for mobile
  if ('ontouchstart' in window) {
    document.body.classList.add('touch-device');
    console.log('Touch device detected - enhanced touch interactions enabled');
  }

  // Performance monitoring
  let performanceMetrics = {
    slideChanges: 0,
    startTime: Date.now()
  };

  [basicCarousel, multiCarousel, imageCarousel, verticalCarousel, fadeCarousel, progressCarousel].forEach(carousel => {
    carousel.container.addEventListener('carousel:slideChange', () => {
      performanceMetrics.slideChanges++;
    });
  });

  // Log performance metrics every 30 seconds
  setInterval(() => {
    const runtime = (Date.now() - performanceMetrics.startTime) / 1000;
    console.log(`Performance: ${performanceMetrics.slideChanges} slide changes in ${runtime.toFixed(1)}s`);
  }, 30000);

  // Intersection Observer for lazy loading optimization
  if ('IntersectionObserver' in window) {
    const carouselObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const carouselId = entry.target.id;
          console.log(`Carousel ${carouselId} is now visible`);
          // Could implement lazy initialization here for better performance
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.carousel-demo').forEach(carousel => {
      carouselObserver.observe(carousel);
    });
  }

  // Error handling demonstration
  window.addEventListener('error', function (e) {
    if (e.message.includes('carousel')) {
      console.error('Carousel error detected:', e.message);
      // Could implement error recovery here
    }
  });

  // Accessibility enhancements
  document.querySelectorAll('.carousel-demo').forEach(carousel => {
    carousel.setAttribute('role', 'region');
    carousel.setAttribute('aria-label', 'Image carousel');
  });

  console.log('🎠 Vanilla Carousel Demo initialized successfully!');
  console.log('Available keyboard shortcuts:');
  console.log('- Numbers 1-3: Jump to specific slides');
  console.log('- P: Toggle autoplay');
  console.log('- Arrow keys: Navigate when carousel is focused');
  console.log('✨ Features:');
  console.log('- Seamless infinite loop (no jump back to start)');
  console.log('- Multiple slides per view with proper spacing');
  console.log('- Unique pagination positioning for each carousel');
  console.log('- Touch/swipe gestures with momentum');
  console.log('- Responsive breakpoints');
  console.log('- Auto-play with pause on hover');
});