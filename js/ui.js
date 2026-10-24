/* ===========================================================
   ui.js: jQuery for Sakura & Bean Kitchen
   Modules:
   1 Loading products with AJAX   4 Back-to-top button
   2 Reacting to store.js events  5 FAQ accordion
   3 Notification pop-up          6 Start-up
   store.js (plain JavaScript) does the logic. This file loads
   the data and adds the effects. Everything runs inside
   $(document).ready().
   =========================================================== */

$(document).ready(function () {

  /* ---------- 1. LOADING PRODUCTS (AJAX) ---------- */
  // The loading message on the home page and on the menu page
  const $messageBox = $('#statusMessage, #featuredMessage');

  const loadProducts = () => {
    $messageBox.prop('hidden', false).text('Loading menu...');

    $.getJSON('products.json')
      .done((products) => {
        setProducts(products);   // defined in store.js, which draws the cards
      })
      .fail((jqXHR, textStatus, errorThrown) => {
        console.error('Could not load products.json:', textStatus, errorThrown);
        $messageBox
          .prop('hidden', false)
          .html('Sorry, the menu could not be loaded. <button id="retryBtn" class="btn-small">Try again</button>');
      });
  };

  // The retry button is created later, so the click is delegated from the document
  $(document).on('click', '#retryBtn', loadProducts);

  /* ---------- 2. REACTING TO store.js EVENTS ---------- */
  // Fade the dish cards in whenever they are drawn
  $(document).on('productsRendered', function () {
    $('.product-card').hide().fadeIn(300);
  });

  // Fade the details panel content in when a dish is opened
  $(document).on('detailsShown', function () {
    $('#detailsContent').hide().fadeIn(300);
  });

  // Update the cart badge and show a pop-up message
  $(document).on('cartUpdated', function (event) {
    const { count, message } = event.originalEvent.detail;

    $('#cartCount').text(count).fadeOut(80).fadeIn(80);   // method chaining
    if (message) showToast(message);
  });

  // Shake the invalid fields and scroll to the first error message
  $(document).on('formInvalid', function () {
    $('.invalid')
      .stop(true, true)
      .animate({ marginLeft: '-8px' }, 60)
      .animate({ marginLeft: '8px' }, 60)
      .animate({ marginLeft: '-8px' }, 60)
      .animate({ marginLeft: '0px' }, 60);

    const $firstError = $('.error').filter(function () {
      return $(this).text() !== '';
    }).first();

    if ($firstError.length) {
      $('html, body').animate({ scrollTop: $firstError.offset().top - 150 }, 300);
    }
  });

  /* ---------- 3. NOTIFICATION POP-UP ---------- */
  $('body').append('<div id="toast" class="toast" role="status"></div>');

  const showToast = (message) => {
    $('#toast').stop(true, true).text(message).fadeIn(200).delay(1800).fadeOut(400);
  };

  /* ---------- 4. BACK-TO-TOP BUTTON ---------- */
  $('body').append('<button id="backToTop" aria-label="Back to top">↑</button>');

  $(window).on('scroll', function () {
    if ($(window).scrollTop() > 300) {
      $('#backToTop').fadeIn(200);
    } else {
      $('#backToTop').fadeOut(200);
    }
  });

  $('#backToTop').on('click', function () {
    $('html, body').animate({ scrollTop: 0 }, 600);
  });

  /* ---------- 5. FAQ ACCORDION (home page) ---------- */
  $('.faq-question').on('click', function () {
    const $answer = $(this).next('.faq-answer');

    $('.faq-answer').not($answer).slideUp(250);          // close the others
    $('.faq-question').not(this).removeClass('open');
    $(this).toggleClass('open');
    $answer.slideToggle(250);
  });

  /* ---------- 6. START-UP ---------- */
  $('#cartCount').text(getCartCount());   // show the saved cart size on every page

  // Only the home page and the menu page need the dishes
  if ($('#featuredGrid, #productGrid').length) {
    loadProducts();
  }

});