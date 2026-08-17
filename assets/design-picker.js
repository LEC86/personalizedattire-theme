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
    var lastSelectedThumb = null;

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

    // Runs the sync after the browser has fully settled layout/paint,
    // rather than trusting a single synchronous getBoundingClientRect()
    // call. A single rAF isn't always enough (especially right after a
    // scroll on Safari/iOS, where layout can still be mid-flight), so
    // this chains a couple of frames plus a short fallback timeout.
    function syncOverlaySizeSettled() {
      syncOverlaySize();
      requestAnimationFrame(function () {
        syncOverlaySize();
        requestAnimationFrame(function () {
          syncOverlaySize();
        });
      });
      setTimeout(syncOverlaySize, 150);
    }

    var scrollSyncScheduled = false;
    function scheduleScrollSync() {
      if (scrollSyncScheduled) return;
      scrollSyncScheduled = true;
      requestAnimationFrame(function () {
        syncOverlaySize();
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

      // Re-measure once the overlay image itself has finished loading,
      // since its own decode/layout can shift things a frame late.
      overlay.addEventListener('load', syncOverlaySize);

      mediaWrapper.appendChild(overlay);

      // Page scrolling (not just scrolling inside the gallery) can move
      // things relative to a sticky media column. Previously only the
      // gallery's own internal scroll was listened for, so a normal
      // page scroll never triggered a recheck -- that's the main cause
      // of the overlay drifting after you scroll and then switch designs.
      window.addEventListener('scroll', scheduleScrollSync, { passive: true });
      window.addEventListener('resize', syncOverlaySizeSettled);
      window.addEventListener('load', syncOverlaySizeSettled);
      mediaWrapper.addEventListener('scroll', scheduleScrollSync, true);

      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function () { syncOverlaySizeSettled(); });
        ro.observe(mediaWrapper);
      }

      // Some themes swap the active slide via a class change (slider
      // transition) slightly after a click/scroll settles. Watch for
      // that so the overlay re-measures against the actual visible image.
      if (window.MutationObserver) {
        var mo = new MutationObserver(function () { syncOverlaySizeSettled(); });
        mo.observe(mediaWrapper, { attributes: true, attributeFilter: ['class'], subtree: true });
      }
    }

    function selectDesign(thumb) {
      var overlaySrc = thumb.getAttribute('data-overlay-src');
      lastSelectedThumb = thumb;

      if (overlay) {
        overlay.src = overlaySrc;
        overlay.hidden = false;
        syncOverlaySizeSettled();
      }

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

    // Auto-select the first design so the overlay shows immediately on load.
    if (thumbs.length > 0) {
      selectDesign(thumbs[0]);
    }
  });
});
