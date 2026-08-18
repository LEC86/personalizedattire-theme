document.addEventListener('DOMContentLoaded', function () {
  var PREMIUM_DESIGN_ADDON_VARIANT_ID = 50266381189359; // "For Front and Back Design" - $3.00

  document.querySelectorAll('[data-design-picker]').forEach(function (picker) {
    var propertyInput = document.querySelector('[data-design-property-input]');
    var imagePropertyInput = document.querySelector('[data-design-image-property-input]');
    var isPremiumSelected = false;

    var formEl = document.querySelector('product-form form') || document.querySelector('form[data-type="add-to-cart-form"]');
    if (formEl) {
      if (propertyInput) formEl.appendChild(propertyInput);
      if (imagePropertyInput) formEl.appendChild(imagePropertyInput);

      formEl.addEventListener('submit', function () {
        if (!isPremiumSelected) return;

        var quantityField = formEl.querySelector('input[name="quantity"]');
        var quantity = quantityField ? parseInt(quantityField.value, 10) || 1 : 1;

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{ id: PREMIUM_DESIGN_ADDON_VARIANT_ID, quantity: quantity }],
          }),
        }).catch(function (err) {
          console.error('Failed to add design upgrade charge:', err);
        });
      });
    }

    var mediaWrapper = document.querySelector('.product__media-wrapper');
    var overlay = null;
    var currentOverlaySrc = '';
    var modalOverlay = null;
    var modalContent = null;

    function getActiveMediaImage() {
      if (!mediaWrapper) return null;
      return (
        mediaWrapper.querySelector('.product__media-item.is-active img') ||
        mediaWrapper.querySelector('.product__media-item img') ||
        mediaWrapper.querySelector('img')
      );
    }

    function syncOverlaySize() {
      if (!overlay || !mediaWrapper) return;
      var activeImg = getActiveMediaImage();
      var target = activeImg || mediaWrapper;
      var wrapperRect = mediaWrapper.getBoundingClientRect();
      var targetRect = target.getBoundingClientRect();

      overlay.style.width = targetRect.width + 'px';
      overlay.style.height = targetRect.height + 'px';
      overlay.style.left = (targetRect.left - wrapperRect.left) + 'px';
      overlay.style.top = (targetRect.top - wrapperRect.top) + 'px';
    }

    function getVisibleModalImage() {
      var modal = document.querySelector('product-modal[open], product-modal.is-active, product-modal.active');
      if (!modal) return null;

      var images = modal.querySelectorAll('.product-media-modal__content > img[data-media-id], .product-media-modal__content img[data-media-id]');
      for (var i = 0; i < images.length; i++) {
        var rect = images[i].getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight) {
          return images[i];
        }
      }
      return images.length ? images[0] : null;
    }

    function syncModalOverlaySize() {
      if (!currentOverlaySrc) return;

      var target = getVisibleModalImage();
      if (!target) {
        if (modalOverlay) modalOverlay.hidden = true;
        return;
      }

      modalContent = target.closest('.product-media-modal__content');
      if (!modalContent) return;

      if (window.getComputedStyle(modalContent).position === 'static') {
        modalContent.style.position = 'relative';
      }

      if (!modalOverlay || modalOverlay.parentNode !== modalContent) {
        if (modalOverlay && modalOverlay.parentNode) modalOverlay.parentNode.removeChild(modalOverlay);
        modalOverlay = document.createElement('img');
        modalOverlay.className = 'design-picker-overlay design-picker-overlay--modal';
        modalOverlay.alt = '';
        modalOverlay.style.position = 'absolute';
        modalOverlay.style.margin = '0';
        modalOverlay.style.maxWidth = 'none';
        modalOverlay.style.objectFit = 'contain';
        modalOverlay.style.pointerEvents = 'none';
        modalOverlay.style.zIndex = '5';
        modalOverlay.addEventListener('load', syncModalOverlaySize);
        modalContent.appendChild(modalOverlay);
      }

      if (modalOverlay.src !== currentOverlaySrc) modalOverlay.src = currentOverlaySrc;
      modalOverlay.hidden = false;

      var contentRect = modalContent.getBoundingClientRect();
      var targetRect = target.getBoundingClientRect();
      modalOverlay.style.width = targetRect.width + 'px';
      modalOverlay.style.height = targetRect.height + 'px';
      modalOverlay.style.left = (targetRect.left - contentRect.left + modalContent.scrollLeft) + 'px';
      modalOverlay.style.top = (targetRect.top - contentRect.top + modalContent.scrollTop) + 'px';
    }

    function syncOverlaySizeSettled() {
      syncOverlaySize();
      syncModalOverlaySize();
      requestAnimationFrame(function () {
        syncOverlaySize();
        syncModalOverlaySize();
        requestAnimationFrame(function () {
          syncOverlaySize();
          syncModalOverlaySize();
        });
      });
      setTimeout(function () {
        syncOverlaySize();
        syncModalOverlaySize();
      }, 150);
    }

    var scrollSyncScheduled = false;
    function scheduleScrollSync() {
      if (scrollSyncScheduled) return;
      scrollSyncScheduled = true;
      requestAnimationFrame(function () {
        syncOverlaySize();
        syncModalOverlaySize();
        scrollSyncScheduled = false;
      });
    }

    if (mediaWrapper) {
      var computedPosition = window.getComputedStyle(mediaWrapper).position;
      if (computedPosition === 'static' || !computedPosition) {
        mediaWrapper.style.position = 'relative';
      }

      overlay = document.createElement('img');
      overlay.className = 'design-picker-overlay';
      overlay.alt = '';
      overlay.style.position = 'absolute';
      overlay.style.margin = '0';
      overlay.style.maxWidth = 'none';
      overlay.style.objectFit = 'contain';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '999';
      overlay.hidden = true;

      overlay.addEventListener('load', syncOverlaySize);
      mediaWrapper.appendChild(overlay);

      window.addEventListener('scroll', scheduleScrollSync, { passive: true });
      window.addEventListener('resize', syncOverlaySizeSettled);
      window.addEventListener('load', syncOverlaySizeSettled);
      mediaWrapper.addEventListener('scroll', scheduleScrollSync, true);
      document.addEventListener('click', function () {
        setTimeout(syncOverlaySizeSettled, 50);
      }, true);

      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function () { syncOverlaySizeSettled(); });
        ro.observe(mediaWrapper);
      }

      if (window.MutationObserver) {
        var mo = new MutationObserver(function () { syncOverlaySizeSettled(); });
        mo.observe(document.body, {
          attributes: true,
          attributeFilter: ['class', 'open', 'style'],
          subtree: true
        });
      }
    }

    function selectDesign(thumb) {
      var overlaySrc = thumb.getAttribute('data-overlay-src');
      currentOverlaySrc = overlaySrc;

      if (overlay) {
        overlay.src = overlaySrc;
        overlay.hidden = false;
        syncOverlaySizeSettled();
      }

      if (modalOverlay) {
        modalOverlay.src = overlaySrc;
      }
      syncModalOverlaySize();

      picker.querySelectorAll('[data-design-thumb]').forEach(function (t) {
        t.classList.remove('is-selected');
      });
      thumb.classList.add('is-selected');

      if (propertyInput) {
        propertyInput.value = thumb.getAttribute('data-design-name');
      }
      if (imagePropertyInput) {
        imagePropertyInput.value = overlaySrc;
      }

      isPremiumSelected = thumb.getAttribute('data-premium') === 'true';
    }

    var thumbs = picker.querySelectorAll('[data-design-thumb]');
    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        selectDesign(thumb);
      });
    });

    if (thumbs.length > 0) {
      selectDesign(thumbs[0]);
    }
  });
});
