/**
 * VanillaCarousel - A comprehensive carousel library
 * Features: Touch/swipe, auto-play, pagination, navigation, responsive, seamless infinite loop
 */
class VanillaCarousel {
  constructor(element, options = {}) {
    this.container = typeof element === 'string' ? document.querySelector(element) : element;
    if (!this.container) {
      throw new Error('Carousel container not found');
    }

    // Default configuration
    this.config = {
      slidesPerView: 1,
      spaceBetween: 0,
      loop: false,
      autoplay: false,
      autoplayDelay: 3000,
      speed: 300,
      effect: 'slide', // 'slide', 'fade', 'cube', 'coverflow'
      direction: 'horizontal', // 'horizontal', 'vertical'
      centeredSlides: false,
      freeMode: false,
      grabCursor: true,
      keyboard: true,
      mousewheel: false,
      lazy: false,
      zoom: false,
      parallax: false,
      
      // Navigation
      navigation: {
        nextEl: null,
        prevEl: null,
      },
      
      // Pagination
      pagination: {
        el: null,
        type: 'bullets', // 'bullets', 'fraction', 'progressbar'
        clickable: true,
        dynamicBullets: false,
      },
      
      // Breakpoints
      breakpoints: {},
      
      // Callbacks
      on: {},
      
      ...options
    };

    this.currentIndex = 0;
    this.realIndex = 0;
    this.slides = [];
    this.originalSlides = [];
    this.isTransitioning = false;
    this.autoplayTimer = null;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchCurrentX = 0;
    this.touchCurrentY = 0;
    this.isDragging = false;
    this.dragStartTime = 0;
    this.velocity = 0;
    this.lastTouchTime = 0;
    this.lastTouchX = 0;
    this.loopedSlides = 0;
    this.isKeyboardFocused = false;
    this.allowSlideNext = true;
    this.allowSlidePrev = true;
    this.isLooping = false; // Track if we're in a loop transition
    
    this.init();
  }

  init() {
    this.createStructure();
    this.bindEvents();
    this.updateBreakpoint();
    this.goToSlide(this.config.loop ? this.loopedSlides : 0, false);
    
    if (this.config.autoplay) {
      this.startAutoplay();
    }
    
    this.emit('init');
  }

  createStructure() {
    // Create wrapper if it doesn't exist
    let wrapper = this.container.querySelector('.carousel-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'carousel-wrapper';
      
      // Move existing children to wrapper
      while (this.container.firstChild) {
        wrapper.appendChild(this.container.firstChild);
      }
      
      this.container.appendChild(wrapper);
    }
    
    this.wrapper = wrapper;
    this.originalSlides = Array.from(this.wrapper.children);
    
    // Add classes
    this.container.classList.add('vanilla-carousel');
    this.container.classList.add(`carousel-${this.config.direction}`);
    
    if (this.config.effect !== 'slide') {
      this.container.classList.add(`carousel-effect-${this.config.effect}`);
    }
    
    if (this.config.grabCursor) {
      this.container.classList.add('carousel-grab');
    }
    
    // Add multi-slide class and CSS variables for proper spacing
    if (this.config.slidesPerView > 1) {
      this.container.classList.add('carousel-multi-slide');
      this.container.style.setProperty('--slides-per-view', this.config.slidesPerView);
      this.container.style.setProperty('--space-between', this.config.spaceBetween + 'px');
    }
    
    // Prepare slides
    this.originalSlides.forEach((slide, index) => {
      slide.classList.add('carousel-slide');
      slide.setAttribute('data-slide-index', index);
      
      if (this.config.lazy) {
        this.setupLazyLoading(slide);
      }
    });
    
    // Create loop duplicates if needed
    if (this.config.loop && this.originalSlides.length > 1) {
      this.createLoopSlides();
    }
    
    this.slides = Array.from(this.wrapper.children);
    
    // Create navigation
    this.createNavigation();
    this.createPagination();
  }

  createLoopSlides() {
    // For seamless loop with multiple slides per view, we need to clone strategically
    // Clone enough slides to cover all possible transitions
    const slidesToClone = Math.max(this.config.slidesPerView * 2, this.originalSlides.length);
    this.loopedSlides = slidesToClone;
    
    // Clone slides at the beginning (for backward transitions)
    // We need to clone slides in reverse order: 8, 7, 6, 5, 4, 3, 2, 1, 8, 7, 6, 5, 4, 3, 2, 1
    for (let i = 0; i < slidesToClone; i++) {
      const slideIndex = (this.originalSlides.length - 1 - (i % this.originalSlides.length) + this.originalSlides.length) % this.originalSlides.length;
      const clone = this.originalSlides[slideIndex].cloneNode(true);
      clone.classList.add('carousel-slide-duplicate-prev');
      clone.setAttribute('data-swiper-slide-index', slideIndex);
      clone.setAttribute('data-clone-type', 'prev');
      this.wrapper.insertBefore(clone, this.wrapper.firstChild);
    }
    
    // Clone slides at the end (for forward transitions)
    for (let i = 0; i < slidesToClone; i++) {
      const slideIndex = i % this.originalSlides.length;
      const clone = this.originalSlides[slideIndex].cloneNode(true);
      clone.classList.add('carousel-slide-duplicate-next');
      clone.setAttribute('data-swiper-slide-index', slideIndex);
      clone.setAttribute('data-clone-type', 'next');
      this.wrapper.appendChild(clone);
    }
    
    // Set initial position to first real slide
    this.currentIndex = this.loopedSlides;
    this.realIndex = 0;
  }

  createNavigation() {
    if (this.config.navigation.nextEl || this.config.navigation.prevEl) {
      this.nextButton = typeof this.config.navigation.nextEl === 'string' 
        ? document.querySelector(this.config.navigation.nextEl)
        : this.config.navigation.nextEl;
        
      this.prevButton = typeof this.config.navigation.prevEl === 'string'
        ? document.querySelector(this.config.navigation.prevEl)
        : this.config.navigation.prevEl;
        
      if (this.nextButton) {
        this.nextButton.classList.add('carousel-button-next');
        this.nextButton.setAttribute('aria-label', 'Next slide');
        this.nextButton.setAttribute('tabindex', '0');
      }
      
      if (this.prevButton) {
        this.prevButton.classList.add('carousel-button-prev');
        this.prevButton.setAttribute('aria-label', 'Previous slide');
        this.prevButton.setAttribute('tabindex', '0');
      }
    }
  }

  createPagination() {
    if (this.config.pagination.el) {
      this.paginationEl = typeof this.config.pagination.el === 'string'
        ? document.querySelector(this.config.pagination.el)
        : this.config.pagination.el;
        
      if (this.paginationEl) {
        this.paginationEl.classList.add('carousel-pagination');
        this.paginationEl.classList.add(`carousel-pagination-${this.config.pagination.type}`);
        this.updatePagination();
      }
    }
  }

  bindEvents() {
    // Touch events with improved responsiveness
    this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });
    
    // Mouse events
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Keyboard events with focus management
    this.container.addEventListener('focus', () => {
      this.isKeyboardFocused = true;
    });
    
    this.container.addEventListener('blur', () => {
      this.isKeyboardFocused = false;
    });
    
    if (this.config.keyboard) {
      this.container.addEventListener('keydown', this.onKeyDown.bind(this));
      this.container.setAttribute('tabindex', '0');
    }
    
    // Mouse wheel
    if (this.config.mousewheel) {
      this.container.addEventListener('wheel', this.onMouseWheel.bind(this), { passive: false });
    }
    
    // Window resize
    window.addEventListener('resize', this.onResize.bind(this));
    
    // Navigation buttons
    if (this.nextButton) {
      this.nextButton.addEventListener('click', () => this.slideNext());
      this.nextButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.slideNext();
        }
      });
    }
    
    if (this.prevButton) {
      this.prevButton.addEventListener('click', () => this.slidePrev());
      this.prevButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.slidePrev();
        }
      });
    }
    
    // Autoplay pause on hover
    if (this.config.autoplay) {
      this.container.addEventListener('mouseenter', () => this.pauseAutoplay());
      this.container.addEventListener('mouseleave', () => this.startAutoplay());
    }
  }

  onTouchStart(e) {
    if (this.isTransitioning) return;
    
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchCurrentX = this.touchStartX;
    this.touchCurrentY = this.touchStartY;
    this.lastTouchX = this.touchStartX;
    this.isDragging = true;
    this.dragStartTime = Date.now();
    this.velocity = 0;
    this.lastTouchTime = this.dragStartTime;
    
    this.pauseAutoplay();
    this.container.classList.add('carousel-dragging');
    
    // Prevent default to avoid scrolling
    e.preventDefault();
  }

  onTouchMove(e) {
    if (!this.isDragging) return;
    
    e.preventDefault();
    
    const touch = e.touches[0];
    this.touchCurrentX = touch.clientX;
    this.touchCurrentY = touch.clientY;
    
    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastTouchTime;
    
    if (timeDiff > 0) {
      const deltaX = this.touchCurrentX - this.lastTouchX;
      this.velocity = deltaX / timeDiff;
      this.lastTouchX = this.touchCurrentX;
      this.lastTouchTime = currentTime;
    }
    
    this.updateSlidePosition();
  }

  onTouchEnd(e) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.container.classList.remove('carousel-dragging');
    
    const deltaX = this.touchCurrentX - this.touchStartX;
    const deltaY = this.touchCurrentY - this.touchStartY;
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    
    if (this.config.direction === 'horizontal' && isHorizontal) {
      this.handleSwipe(deltaX);
    } else if (this.config.direction === 'vertical' && !isHorizontal) {
      this.handleSwipe(deltaY);
    } else {
      this.goToSlide(this.currentIndex);
    }
    
    if (this.config.autoplay) {
      this.startAutoplay();
    }
  }

  onMouseDown(e) {
    if (e.button !== 0) return; // Only left mouse button
    
    e.preventDefault();
    this.onTouchStart({
      touches: [{ clientX: e.clientX, clientY: e.clientY }],
      preventDefault: () => e.preventDefault()
    });
  }

  onMouseMove(e) {
    if (!this.isDragging) return;
    
    this.onTouchMove({
      touches: [{ clientX: e.clientX, clientY: e.clientY }],
      preventDefault: () => {}
    });
  }

  onMouseUp(e) {
    if (!this.isDragging) return;
    
    this.onTouchEnd({});
  }

  onKeyDown(e) {
    if (!this.isKeyboardFocused && !this.container.contains(document.activeElement)) return;
    
    let handled = false;
    
    switch (e.key) {
      case 'ArrowLeft':
        if (this.config.direction === 'horizontal') {
          this.slidePrev();
          handled = true;
        }
        break;
      case 'ArrowRight':
        if (this.config.direction === 'horizontal') {
          this.slideNext();
          handled = true;
        }
        break;
      case 'ArrowUp':
        if (this.config.direction === 'vertical') {
          this.slidePrev();
          handled = true;
        }
        break;
      case 'ArrowDown':
        if (this.config.direction === 'vertical') {
          this.slideNext();
          handled = true;
        }
        break;
      case 'Home':
        this.slideTo(0);
        handled = true;
        break;
      case 'End':
        this.slideTo(this.originalSlides.length - 1);
        handled = true;
        break;
    }
    
    if (handled) {
      e.preventDefault();
    }
  }

  onMouseWheel(e) {
    e.preventDefault();
    
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      if (e.deltaY > 0) {
        this.slideNext();
      } else {
        this.slidePrev();
      }
    }
  }

  onResize() {
    this.updateBreakpoint();
    this.goToSlide(this.currentIndex, false);
  }

  updateBreakpoint() {
    const width = window.innerWidth;
    let activeBreakpoint = null;
    
    Object.keys(this.config.breakpoints)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(breakpoint => {
        if (width >= breakpoint) {
          activeBreakpoint = this.config.breakpoints[breakpoint];
        }
      });
    
    if (activeBreakpoint) {
      Object.assign(this.config, activeBreakpoint);
      
      // Update CSS variables for multi-slide
      if (this.config.slidesPerView > 1) {
        this.container.classList.add('carousel-multi-slide');
        this.container.style.setProperty('--slides-per-view', this.config.slidesPerView);
        this.container.style.setProperty('--space-between', this.config.spaceBetween + 'px');
      } else {
        this.container.classList.remove('carousel-multi-slide');
      }
    }
  }

  handleSwipe(delta) {
    const threshold = 50;
    const velocity = Math.abs(this.velocity);
    
    if (Math.abs(delta) > threshold || velocity > 0.3) {
      if (delta > 0) {
        this.slidePrev();
      } else {
        this.slideNext();
      }
    } else {
      this.goToSlide(this.currentIndex);
    }
  }

  updateSlidePosition() {
    const deltaX = this.touchCurrentX - this.touchStartX;
    const deltaY = this.touchCurrentY - this.touchStartY;
    const delta = this.config.direction === 'horizontal' ? deltaX : deltaY;
    
    if (this.config.freeMode) {
      this.setTransform(this.getTranslate() + delta);
    } else {
      const resistance = 0.2;
      const resistedDelta = delta * resistance;
      this.setTransform(this.getSlideTranslate(this.currentIndex) + resistedDelta);
    }
  }

  slideNext() {
    if (this.isTransitioning || !this.allowSlideNext) return;
    
    if (this.config.loop) {
      this.goToSlide(this.currentIndex + 1);
    } else {
      const nextIndex = Math.min(this.currentIndex + 1, this.slides.length - this.config.slidesPerView);
      if (nextIndex !== this.currentIndex) {
        this.goToSlide(nextIndex);
      }
    }
  }

  slidePrev() {
    if (this.isTransitioning || !this.allowSlidePrev) return;
    
    if (this.config.loop) {
      this.goToSlide(this.currentIndex - 1);
    } else {
      const prevIndex = Math.max(this.currentIndex - 1, 0);
      if (prevIndex !== this.currentIndex) {
        this.goToSlide(prevIndex);
      }
    }
  }

  goToSlide(index, animated = true) {
    if (this.isTransitioning && animated) return;
    
    const prevIndex = this.currentIndex;
    const prevRealIndex = this.realIndex;
    
    this.currentIndex = index;
    this.updateRealIndex();
    
    this.updateSlides(animated);
    this.updateNavigation();
    this.updatePagination();
    
    // Handle seamless loop after the slide update
    if (this.config.loop && animated) {
      this.checkAndHandleLoop();
    }
    
    if (prevRealIndex !== this.realIndex) {
      this.emit('slideChange', { 
        from: prevIndex, 
        to: this.currentIndex, 
        realIndex: this.realIndex,
        previousRealIndex: prevRealIndex
      });
    }
  }

  checkAndHandleLoop() {
    // Prevent multiple loop handling
    if (this.isLooping) return;
    
    const totalSlides = this.slides.length;
    const lastRealSlideIndex = totalSlides - this.loopedSlides - 1;
    const firstRealSlideIndex = this.loopedSlides;
    
    if (this.currentIndex > lastRealSlideIndex || this.currentIndex < firstRealSlideIndex) {
      this.isLooping = true;
      
      // Disable further navigation during loop transition
      this.allowSlideNext = false;
      this.allowSlidePrev = false;
      
      // Calculate equivalent position immediately
      let equivalentIndex;
      if (this.currentIndex > lastRealSlideIndex) {
        // Went past end, equivalent position at start
        equivalentIndex = firstRealSlideIndex + (this.currentIndex - lastRealSlideIndex - 1);
      } else {
        // Went before start, equivalent position at end
        equivalentIndex = lastRealSlideIndex + (this.currentIndex - firstRealSlideIndex + 1);
      }
      
      // Listen for the actual transition end
      const handleTransitionEnd = (e) => {
        // Only handle transform transitions on the wrapper, and only once
        if (e.target !== this.wrapper || !e.propertyName.includes('transform') || !this.isLooping) {
          return;
        }

        // Remove the event listener immediately
        this.wrapper.removeEventListener('transitionend', handleTransitionEnd);

        const completeLoop = () => {
          // Instantly move to equivalent position without any transition
          this.wrapper.style.transitionDuration = '0ms';
          this.currentIndex = equivalentIndex;
          this.updateRealIndex();
          this.setTransform(this.getSlideTranslate(this.currentIndex));

          // Force a reflow to ensure the change is applied
          this.wrapper.offsetHeight;

          // Re-enable everything after the next frame
          requestAnimationFrame(() => {
            this.wrapper.style.transitionDuration = '';
            this.allowSlideNext = true;
            this.allowSlidePrev = true;
            this.isLooping = false;
          });
        };

        // Wait for the next paint before completing the loop
        requestAnimationFrame(() => {
          requestAnimationFrame(completeLoop);
        });
      };
      
      // Add the transition end listener
      this.wrapper.addEventListener('transitionend', handleTransitionEnd);
      
      // Fallback timeout in case transitionend doesn't fire
      setTimeout(() => {
        if (this.isLooping) {
          handleTransitionEnd({ target: this.wrapper, propertyName: 'transform' });
        }
      }, this.config.speed + 100);
    }
  }

  updateRealIndex() {
    if (this.config.loop) {
      let realIndex = this.currentIndex - this.loopedSlides;
      
      // Normalize the real index
      if (realIndex < 0) {
        realIndex = this.originalSlides.length + realIndex;
      } else if (realIndex >= this.originalSlides.length) {
        realIndex = realIndex % this.originalSlides.length;
      }
      
      this.realIndex = Math.max(0, Math.min(realIndex, this.originalSlides.length - 1));
    } else {
      this.realIndex = this.currentIndex;
    }
  }

  updateSlides(animated = true) {
    if (animated) {
      this.isTransitioning = true;
      this.wrapper.style.transitionDuration = `${this.config.speed}ms`;
      
      setTimeout(() => {
        this.isTransitioning = false;
        // Only reset transition duration if it hasn't been manually set to 0ms
        if (this.wrapper.style.transitionDuration !== '0ms') {
          this.wrapper.style.transitionDuration = '';
        }
      }, this.config.speed);
    } else {
      this.wrapper.style.transitionDuration = '0ms';
      // Use requestAnimationFrame to ensure the transition is properly disabled
      requestAnimationFrame(() => {
        this.wrapper.style.transitionDuration = '';
      });
    }
    
    this.setTransform(this.getSlideTranslate(this.currentIndex));
    
    // Update slide states
    this.slides.forEach((slide, index) => {
      slide.classList.remove('carousel-slide-active', 'carousel-slide-prev', 'carousel-slide-next');
      
      if (this.isSlideActive(index)) {
        slide.classList.add('carousel-slide-active');
      } else if (index === this.currentIndex - 1) {
        slide.classList.add('carousel-slide-prev');
      } else if (index === this.currentIndex + this.config.slidesPerView) {
        slide.classList.add('carousel-slide-next');
      }
    });
    
    // Load lazy images for active slides
    if (this.config.lazy) {
      this.loadLazyImages();
    }
  }

  isSlideActive(index) {
    const activeStart = this.currentIndex;
    const activeEnd = this.currentIndex + this.config.slidesPerView - 1;
    
    return index >= activeStart && index <= activeEnd;
  }

  getSlideTranslate(index) {
    const slideSize = this.getSlideSize();
    const spaceBetween = this.config.spaceBetween;
    
    return -(index * (slideSize + spaceBetween));
  }

  getSlideSize() {
    const containerSize = this.getContainerSize();
    
    if (this.config.slidesPerView > 1) {
      const spaceBetween = this.config.spaceBetween;
      const totalSpacing = spaceBetween * (this.config.slidesPerView - 1);
      return (containerSize - totalSpacing) / this.config.slidesPerView;
    }
    
    return containerSize;
  }

  getContainerSize() {
    const rect = this.container.getBoundingClientRect();
    return this.config.direction === 'horizontal' ? rect.width : rect.height;
  }

  getTranslate() {
    const transform = this.wrapper.style.transform;
    const match = transform.match(/translate(?:3d|X|Y)?\(([^)]+)\)/);
    
    if (match) {
      const values = match[1].split(',').map(v => parseFloat(v.trim()));
      return this.config.direction === 'horizontal' ? values[0] : values[1] || values[0];
    }
    
    return 0;
  }

  setTransform(translate) {
    if (this.config.direction === 'horizontal') {
      this.wrapper.style.transform = `translate3d(${translate}px, 0, 0)`;
    } else {
      this.wrapper.style.transform = `translate3d(0, ${translate}px, 0)`;
    }
  }

  updateNavigation() {
    if (!this.config.loop) {
      if (this.nextButton) {
        this.nextButton.classList.toggle('carousel-button-disabled', 
          this.currentIndex >= this.slides.length - this.config.slidesPerView);
      }
      
      if (this.prevButton) {
        this.prevButton.classList.toggle('carousel-button-disabled', 
          this.currentIndex <= 0);
      }
    } else {
      // In loop mode, buttons are never disabled
      if (this.nextButton) {
        this.nextButton.classList.remove('carousel-button-disabled');
      }
      
      if (this.prevButton) {
        this.prevButton.classList.remove('carousel-button-disabled');
      }
    }
  }

  updatePagination() {
    if (!this.paginationEl) return;
    
    if (this.config.pagination.type === 'bullets') {
      this.updateBulletPagination();
    } else if (this.config.pagination.type === 'fraction') {
      this.updateFractionPagination();
    } else if (this.config.pagination.type === 'progressbar') {
      this.updateProgressPagination();
    }
  }

  updateBulletPagination() {
    const bulletsCount = this.originalSlides.length;
    
    if (this.paginationEl.children.length !== bulletsCount) {
      this.paginationEl.innerHTML = '';
      
      for (let i = 0; i < bulletsCount; i++) {
        const bullet = document.createElement('span');
        bullet.className = 'carousel-pagination-bullet';
        bullet.setAttribute('role', 'button');
        bullet.setAttribute('aria-label', `Go to slide ${i + 1}`);
        bullet.setAttribute('tabindex', '0');
        
        if (this.config.pagination.clickable) {
          bullet.addEventListener('click', () => {
            this.slideTo(i);
          });
          
          bullet.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              this.slideTo(i);
            }
          });
        }
        
        this.paginationEl.appendChild(bullet);
      }
    }
    
    Array.from(this.paginationEl.children).forEach((bullet, index) => {
      bullet.classList.toggle('carousel-pagination-bullet-active', index === this.realIndex);
    });
  }

  updateFractionPagination() {
    this.paginationEl.innerHTML = `
      <span class="carousel-pagination-current">${this.realIndex + 1}</span>
      <span class="carousel-pagination-separator"> / </span>
      <span class="carousel-pagination-total">${this.originalSlides.length}</span>
    `;
  }

  updateProgressPagination() {
    const progress = (this.realIndex / (this.originalSlides.length - 1)) * 100;
    this.paginationEl.innerHTML = `<span class="carousel-pagination-progress" style="width: ${progress}%"></span>`;
  }

  startAutoplay() {
    if (!this.config.autoplay || this.autoplayTimer) return;
    
    this.autoplayTimer = setInterval(() => {
      this.slideNext();
    }, this.config.autoplayDelay);
  }

  pauseAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  setupLazyLoading(slide) {
    const images = slide.querySelectorAll('img[data-src]');
    
    images.forEach(img => {
      img.classList.add('carousel-lazy');
    });
  }

  loadLazyImages() {
    const activeSlides = Array.from(this.wrapper.children).filter((slide, index) => 
      this.isSlideActive(index)
    );
    
    activeSlides.forEach(slide => {
      const lazyImages = slide.querySelectorAll('img.carousel-lazy[data-src]');
      
      lazyImages.forEach(img => {
        img.src = img.dataset.src;
        img.classList.remove('carousel-lazy');
        img.removeAttribute('data-src');
      });
    });
  }

  destroy() {
    this.pauseAutoplay();
    
    // Remove event listeners
    this.container.removeEventListener('touchstart', this.onTouchStart);
    this.container.removeEventListener('touchmove', this.onTouchMove);
    this.container.removeEventListener('touchend', this.onTouchEnd);
    this.container.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.onResize);
    
    // Remove classes
    this.container.classList.remove('vanilla-carousel');
    
    this.emit('destroy');
  }

  emit(event, data = {}) {
    if (this.config.on[event]) {
      this.config.on[event].call(this, data);
    }
    
    const customEvent = new CustomEvent(`carousel:${event}`, { detail: data });
    this.container.dispatchEvent(customEvent);
  }

  // Public API methods
  update() {
    this.updateBreakpoint();
    this.goToSlide(this.currentIndex, false);
    this.updatePagination();
  }

  slideTo(index) {
    const targetIndex = this.config.loop ? index + this.loopedSlides : index;
    this.goToSlide(targetIndex);
  }

  enable() {
    this.container.classList.remove('carousel-disabled');
  }

  disable() {
    this.container.classList.add('carousel-disabled');
  }

  get activeIndex() {
    return this.realIndex;
  }

  get isBeginning() {
    return !this.config.loop && this.currentIndex === 0;
  }

  get isEnd() {
    return !this.config.loop && this.currentIndex >= this.slides.length - this.config.slidesPerView;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VanillaCarousel;
} else if (typeof window !== 'undefined') {
  window.VanillaCarousel = VanillaCarousel;
}
