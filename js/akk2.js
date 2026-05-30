class RulesStack {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    this.wrapper = this.container.parentElement;
    this.items = [...this.container.querySelectorAll('.rule-card')];
    this.currentActive = 0;
    this.hasBeenActivated = false;
    this.isDesktop = window.innerWidth > 834;
    
    this.settings = this.getSettings();
    
    this.rotationPresets = {
      0: [0, -8, 9, 0, 0, 0, 0],
      1: [8, 0, -8, 0, 0, 0, 0],
      2: [0, 8, 0, -8, 0, 0, 0],
      3: [0, 0, 8, 0, -8, 0, 0],
      4: [0, 0, 0, 8, 0, -8, 0],
      5: [0, 0, 0, 0, 8, 0, -8],
      6: [0, 0, 0, 0, -9, 6, 0]
    };
    
    this.init();
  }
  
  getSettings() {
    const width = window.innerWidth;
    
    if (width > 1366) {
      return { cardWidth: 792, gap: 136 };
    } else if (width > 834) {
      return { cardWidth: 560, gap: 96 };
    } else {
      return { cardWidth: 368, gap: 0 };
    }
  }
  
  init() {
    this.isDesktop = window.innerWidth > 834;
    
    if (this.isDesktop) {
      setTimeout(() => {
        this.setInitialPositions();
        this.updateCardsState(0);
      }, 10);
      
      this.bindEvents();
    } else {
      this.enableMobileMode();
    }
    
    window.addEventListener('resize', () => this.handleResize());
  }
  
  bindEvents() {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isTablet = window.innerWidth >= 768 && window.innerWidth <= 1024;
    
    this.items.forEach((item, index) => {
      const handler = () => {
        this.hasBeenActivated = true;
        this.activateCard(index);
      };
      
      item.removeEventListener('click', handler);
      item.removeEventListener('mouseenter', handler);
      
      if (isTablet && isTouch) {
        item.addEventListener('click', handler);
      } else {
        item.addEventListener('mouseenter', handler);
      }
    });
  }
  
  getAdaptiveSettings() {
    const settings = this.getSettings();
    const containerWidth = this.container.offsetWidth;
    const itemsCount = this.items.length;
    
    let cardWidth = settings.cardWidth;
    let gap = settings.gap;
    let stackWidth = cardWidth + (gap * (itemsCount - 1));
    
    if (stackWidth > containerWidth) {
      const minGap = 20;
      gap = Math.max(minGap, (containerWidth - cardWidth) / (itemsCount - 1));
      stackWidth = cardWidth + (gap * (itemsCount - 1));
      
      if (stackWidth > containerWidth) {
        cardWidth = (containerWidth - (minGap * (itemsCount - 1)));
        gap = minGap;
        stackWidth = containerWidth;
      }
    }
    
    const startOffset = (containerWidth - stackWidth) / 2;
    
    return { cardWidth, gap, startOffset };
  }
  
  setInitialPositions() {
    if (!this.isDesktop) return;
    
    const { cardWidth, gap, startOffset } = this.getAdaptiveSettings();
    
    this.items.forEach((item, index) => {
      item.style.left = `${startOffset + (index * gap)}px`;
      item.style.width = `${cardWidth}px`;
      item.style.height = 'auto';
      item.style.aspectRatio = `${cardWidth} / ${cardWidth * 408 / 792}`;
    });
  }
  
  updateCardsState(activeIndex) {
    if (!this.isDesktop) return;
    
    this.currentActive = activeIndex;
    const rotations = this.rotationPresets[activeIndex] || this.rotationPresets[0];
    
    this.items.forEach((item, index) => {
      const distance = Math.abs(index - activeIndex);
      const zIndex = 100 - (distance * 10);
      
      item.style.zIndex = zIndex;
      
      const title = item.querySelector('.rule-card__title');
      const desc = item.querySelector('.rule-card__description');
      
      if (index === activeIndex) {
        item.classList.add('active-card');
        item.style.transform = `translateY(-8px) rotate(0deg)`;
        if (title) title.style.opacity = 1;
        if (desc) desc.style.opacity = 1;
      } else {
        item.classList.remove('active-card');
        
        const opacity = Math.max(0.1, 1 - (distance * 0.3));
        if (title) title.style.opacity = opacity;
        if (desc) desc.style.opacity = opacity;
        
        const rotation = rotations[index];
        item.style.transform = `rotate(${rotation}deg)`;
      }
    });
  }
  
  activateCard(index) {
    this.updateCardsState(index);
  }
  
  handleResize() {
    const newIsDesktop = window.innerWidth > 834;
    
    if (newIsDesktop !== this.isDesktop) {
      this.isDesktop = newIsDesktop;
      
      if (this.isDesktop) {
        this.setInitialPositions();
        this.updateCardsState(this.currentActive);
        this.bindEvents();
      } else {
        this.enableMobileMode();
      }
    } else if (this.isDesktop) {
      this.setInitialPositions();
      this.updateCardsState(this.currentActive);
    }
  }
  
  enableMobileMode() {
    this.items.forEach(item => {
      item.style.left = '';
      item.style.width = '';
      item.style.height = '';
      item.style.aspectRatio = '';
      item.style.zIndex = '';
      item.style.transform = '';
      item.classList.remove('active-card');
      
      const title = item.querySelector('.rule-card__title');
      const desc = item.querySelector('.rule-card__description');
      if (title) title.style.opacity = '';
      if (desc) desc.style.opacity = '';
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new RulesStack('#rulesStack');
});