(function () {
  function absolutizeUpload(url) {
    var clean = String(url || "").replace(/^\/+/, "");
    if (/^(https?:)?\/\//.test(clean) || clean.indexOf("uploads/") === 0) {
      return clean;
    }
    if (/^\d+\/\d+\/\d+\/\d+\//.test(clean)) {
      return "uploads/" + clean;
    }
    return clean;
  }

  function normalizeEmbeds() {
    document.querySelectorAll("iframe[src]").forEach(function (iframe) {
      var src = iframe.getAttribute("src").trim();
      src = src.replace(/^http:\/\/www\.youtube\.com\//, "https://www.youtube.com/");
      src = src.replace(/^http:\/\/youtube\.com\//, "https://www.youtube.com/");
      src = src.replace(/^https:\/\/www\.youtube-nocookie\.com\//, "https://www.youtube.com/");
      src = src.replace(/^http:\/\/player\.vimeo\.com\//, "https://player.vimeo.com/");
      iframe.setAttribute("src", src);

      if (/youtube\.com\/embed\//.test(src)) {
        if (/^https?:\/\//.test(window.location.origin)) {
          try {
            var youtubeUrl = new URL(src, window.location.href);
            if (!youtubeUrl.searchParams.has("origin")) {
              youtubeUrl.searchParams.set("origin", window.location.origin);
              src = youtubeUrl.toString();
              iframe.setAttribute("src", src);
            }
          } catch (error) {
            console.warn("Could not add YouTube origin parameter", error);
          }
        }
        iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
        iframe.setAttribute("allowfullscreen", "");
        if (!iframe.getAttribute("title")) {
          iframe.setAttribute("title", "YouTube video player");
        }
      }

      if (/youtube|vimeo/.test(src) && !iframe.closest(".embed-container") && !iframe.closest(".wsite-youtube-container")) {
        var wrapper = document.createElement("div");
        wrapper.className = "embed-container";
        iframe.parentNode.insertBefore(wrapper, iframe);
        wrapper.appendChild(iframe);
      }
    });
  }

  function renderSlideshow(config) {
    var mount = document.getElementById(config.elementID + "-slideshow");
    if (!mount || mount.dataset.staticRendered === "true" || !config.images || !config.images.length) {
      return;
    }

    mount.dataset.staticRendered = "true";
    var state = { index: config.randomStart === "true" ? Math.floor(Math.random() * config.images.length) : 0 };
    var root = document.createElement("div");
    root.className = "static-slideshow";

    var stage = document.createElement("div");
    stage.className = "static-slideshow-stage";
    if (config.aspectRatio === "auto") {
      stage.style.aspectRatio = "3 / 2";
    }

    var image = document.createElement("img");
    var caption = document.createElement("div");
    caption.className = "static-slideshow-caption";
    var prev = document.createElement("button");
    prev.className = "static-slideshow-button static-slideshow-prev";
    prev.type = "button";
    prev.setAttribute("aria-label", "Previous image");
    prev.textContent = "‹";
    var next = document.createElement("button");
    next.className = "static-slideshow-button static-slideshow-next";
    next.type = "button";
    next.setAttribute("aria-label", "Next image");
    next.textContent = "›";

    stage.appendChild(image);
    stage.appendChild(caption);
    stage.appendChild(prev);
    stage.appendChild(next);
    root.appendChild(stage);

    var thumbs = document.createElement("div");
    thumbs.className = "static-slideshow-thumbs";
    if (config.nav !== "none") {
      config.images.forEach(function (item, index) {
        var thumbButton = document.createElement("button");
        thumbButton.className = "static-slideshow-thumb";
        thumbButton.type = "button";
        thumbButton.setAttribute("aria-label", "Show image " + (index + 1));
        var thumbImage = document.createElement("img");
        thumbImage.src = absolutizeUpload(item.url);
        thumbImage.alt = item.alt || item.caption || "";
        thumbButton.appendChild(thumbImage);
        thumbButton.addEventListener("click", function () {
          state.index = index;
          update();
        });
        thumbs.appendChild(thumbButton);
      });
      root.appendChild(thumbs);
    }

    function update() {
      var current = config.images[state.index];
      image.src = absolutizeUpload(current.url);
      image.alt = current.alt || current.caption || "";
      caption.innerHTML = current.caption || "";
      caption.style.display = current.caption ? "block" : "none";
      thumbs.querySelectorAll(".static-slideshow-thumb").forEach(function (button, index) {
        button.classList.toggle("is-active", index === state.index);
      });
    }

    function move(delta) {
      state.index = (state.index + delta + config.images.length) % config.images.length;
      update();
    }

    prev.addEventListener("click", function () { move(-1); });
    next.addEventListener("click", function () { move(1); });
    mount.appendChild(root);
    update();

    if (config.autoplay === "1") {
      window.setInterval(function () { move(1); }, Math.max(Number(config.speed) || 5, 2) * 1000);
    }
  }

  function renderInlineSlideshows() {
    function extractRenderConfig(text, startIndex) {
      var openIndex = text.indexOf("(", startIndex);
      var depth = 0;
      var quote = "";
      var escaped = false;

      for (var index = openIndex; index < text.length; index += 1) {
        var char = text[index];

        if (quote) {
          if (escaped) {
            escaped = false;
          } else if (char === "\\") {
            escaped = true;
          } else if (char === quote) {
            quote = "";
          }
          continue;
        }

        if (char === "\"" || char === "'") {
          quote = char;
        } else if (char === "(") {
          depth += 1;
        } else if (char === ")") {
          depth -= 1;
          if (depth === 0) {
            return text.slice(openIndex + 1, index);
          }
        }
      }

      return "";
    }

    document.querySelectorAll("script").forEach(function (script) {
      var text = script.textContent || "";
      var renderIndex = text.indexOf("window.wSlideshow.render");
      if (renderIndex === -1) {
        return;
      }

      var configText = extractRenderConfig(text, renderIndex);
      if (!configText) {
        return;
      }

      try {
        renderSlideshow(Function("return (" + configText + ");")());
      } catch (error) {
        console.warn("Could not render migrated slideshow", error);
      }
    });
  }

  function setupLightbox() {
    var overlay = document.createElement("div");
    overlay.className = "static-lightbox";
    overlay.innerHTML = "<button type=\"button\" aria-label=\"Close image\">×</button><img alt=\"\">";
    document.body.appendChild(overlay);

    var overlayImage = overlay.querySelector("img");
    function close() {
      overlay.classList.remove("is-open");
      overlayImage.removeAttribute("src");
    }

    overlay.querySelector("button").addEventListener("click", close);
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        close();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        close();
      }
    });

    document.querySelectorAll(".imageGallery a[rel^='lightbox'], a.w-fancybox").forEach(function (link) {
      link.removeAttribute("target");
      link.addEventListener("click", function (event) {
        event.preventDefault();
        overlayImage.src = link.href;
        overlayImage.alt = link.getAttribute("title") || "";
        overlay.classList.add("is-open");
      });
    });
  }

  function setupCooperationCloud() {
    document.querySelectorAll(".cooperation-cloud").forEach(function (cloud) {
      var items = Array.prototype.slice.call(cloud.querySelectorAll(".cooperation-cloud-item"));
      if (!items.length) {
        return;
      }

      items.forEach(function (item, index) {
        var weight = Number(item.dataset.weight || 1);
        var depth = Number(item.dataset.depth || 0);
        var driftX = ((index % 6) - 2.5) * 1.6;
        var driftY = (((index * 3) % 7) - 3) * 1.3;
        item.style.setProperty("--cloud-weight", weight);
        item.style.setProperty("--cloud-depth", depth);
        item.style.setProperty("--cloud-drift-x", driftX + "px");
        item.style.setProperty("--cloud-drift-y", driftY + "px");
      });

      function move(event) {
        var rect = cloud.getBoundingClientRect();
        var x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        var y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

        items.forEach(function (item, index) {
          var weight = Number(item.dataset.weight || 1);
          var depth = Number(item.dataset.depth || 0);
          var direction = index % 2 === 0 ? 1 : -1;
          var reach = 8 + weight * 4 + Math.abs(depth) * 2;
          var shiftX = x * reach * direction;
          var shiftY = y * (reach * 0.62) * (depth >= 0 ? 1 : -1);
          item.style.setProperty("--cloud-x", shiftX.toFixed(2) + "px");
          item.style.setProperty("--cloud-y", shiftY.toFixed(2) + "px");
        });
      }

      function reset() {
        items.forEach(function (item) {
          item.style.setProperty("--cloud-x", "0px");
          item.style.setProperty("--cloud-y", "0px");
        });
      }

      cloud.addEventListener("pointermove", move);
      cloud.addEventListener("pointerleave", reset);
      reset();
    });
  }

  function ready(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  ready(function () {
    normalizeEmbeds();

    document.querySelectorAll(".wsite-menu-item-wrap, .wsite-menu-subitem-wrap").forEach(function (item) {
      if (item.querySelector(":scope > .wsite-menu-wrap")) {
        item.classList.add("has-submenu");
        if (!item.querySelector(":scope > .icon-caret")) {
          var caret = document.createElement("span");
          caret.className = "icon-caret";
          item.insertBefore(caret, item.querySelector(":scope > .wsite-menu-wrap"));
        }
      }
    });

    function closeMobileNav() {
      document.body.classList.remove("nav-open");
      document.querySelectorAll("label.hamburger").forEach(function (button) {
        button.setAttribute("aria-expanded", "false");
      });
    }

    function toggleMobileNav(event) {
      event.preventDefault();
      var isOpen = document.body.classList.toggle("nav-open");
      document.querySelectorAll("label.hamburger").forEach(function (button) {
        button.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    }

    document.querySelectorAll("label.hamburger").forEach(function (button) {
      button.setAttribute("role", "button");
      button.setAttribute("aria-label", "Toggle navigation");
      button.setAttribute("aria-expanded", document.body.classList.contains("nav-open") ? "true" : "false");
      button.addEventListener("click", toggleMobileNav);
      button.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          toggleMobileNav(event);
        }
      });
    });

    document.querySelectorAll(".mobile-nav a").forEach(function (link) {
      link.addEventListener("click", closeMobileNav);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMobileNav();
      }
    });

    document.querySelectorAll(".icon-caret").forEach(function (button) {
      button.addEventListener("click", function () {
        var menu = button.parentElement && button.parentElement.querySelector(":scope > .wsite-menu-wrap");
        if (menu) {
          menu.classList.toggle("open");
        }
      });
    });

    renderInlineSlideshows();
    setupLightbox();
    setupCooperationCloud();
  });
})();

