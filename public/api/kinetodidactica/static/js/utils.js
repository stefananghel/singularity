console.log("test");
// Remove all <nav class="navbar navbar-default"> elements from the DOM
window.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('nav.navbar.navbar-default').forEach(function(el) {
    el.remove();
  });
});
