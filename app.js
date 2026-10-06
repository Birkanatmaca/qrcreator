(function () {
  var form = document.getElementById("card-form");
  var orgInput = document.getElementById("org");
  var titleInput = document.getElementById("title");
  var firstInput = document.getElementById("first");
  var lastInput = document.getElementById("last");
  var phoneInput = document.getElementById("phone");
  var emailInput = document.getElementById("email");
  var statusEl = document.getElementById("status");
  var pngButton = document.getElementById("download-png");
  var clearPngButton = document.getElementById("download-clear");
  var invertPngButton = document.getElementById("download-invert");
  var fgInput = document.getElementById("fg-color");
  var bgInput = document.getElementById("bg-color");
  var bgField = document.getElementById("bg-field");
  var monoButton = document.getElementById("look-mono");
  var invertButton = document.getElementById("look-invert");
  var clearButton = document.getElementById("look-clear");
  var logoInput = document.getElementById("logo");
  var logoAdd = document.getElementById("logo-add");
  var logoRemove = document.getElementById("logo-remove");
  var logoSizeInput = document.getElementById("logo-size");
  var logoSizeField = document.getElementById("logo-size-field");
  var logoRoundButton = document.getElementById("logo-round");
  var logo = { image: null, url: "" };
  var vcfButton = document.getElementById("download-vcf");
  var printButton = document.getElementById("print-card");
  var emptyEl = document.getElementById("qr-empty");
  var canvas = document.getElementById("qr-canvas");
  var nameEl = document.getElementById("pass-name");
  var titleEl = document.getElementById("pass-title");
  var orgEl = document.getElementById("pass-org");
  var phoneEl = document.getElementById("pass-phone");
  var emailEl = document.getElementById("pass-email");
  var passPhoto = document.getElementById("pass-photo");
  var photoInput = document.getElementById("photo");
  var photoAdd = document.getElementById("photo-add");
  var photoRemove = document.getElementById("photo-remove");
  var passEl = document.getElementById("pass");

  var previewSize = 280;
  var photo = { base64: "", previewUrl: "" };

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function esc(value) {
    return clean(value)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function normalizePhone(raw) {
    var compact = String(raw || "").trim().replace(/[^\d+]/g, "");
    if (!compact) return { ok: false, empty: true };

    if (compact.indexOf("+") > 0) {
      return { ok: false, empty: false, reason: "Numaranın başında + olmalı." };
    }
    if (compact.startsWith("00")) compact = "+" + compact.slice(2);

    var e164 = "";
    if (compact.startsWith("+")) {
      var digits = compact.slice(1);
      if (!/^\d{8,15}$/.test(digits)) {
        return { ok: false, empty: false, reason: "Numara eksik görünüyor. Ülke koduyla birlikte yazın." };
      }
      e164 = "+" + digits;
    } else if (/^0\d{10}$/.test(compact)) {
      e164 = "+90" + compact.slice(1);
    } else if (/^5\d{9}$/.test(compact)) {
      e164 = "+90" + compact;
    } else if (/^90\d{10}$/.test(compact)) {
      e164 = "+" + compact;
    } else if (/^\d{8,15}$/.test(compact)) {
      e164 = "+" + compact;
    } else {
      return {
        ok: false,
        empty: false,
        reason: "Numarayı 05xx xxx xx xx ya da +90 5xx xxx xx xx biçiminde yazın."
      };
    }

    return { ok: true, empty: false, e164: e164, display: formatDisplay(e164) };
  }

  function formatDisplay(e164) {
    if (/^\+90\d{10}$/.test(e164)) {
      var n = e164.slice(3);
      return "+90 " + n.slice(0, 3) + " " + n.slice(3, 6) + " " + n.slice(6, 8) + " " + n.slice(8);
    }
    return e164;
  }

  function normalizeEmail(raw) {
    var value = clean(raw);
    if (!value) return { ok: true, empty: true, value: "" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      return { ok: false, empty: false, value: value, reason: "E-postayı ad@sirket.com biçiminde yazın." };
    }
    return { ok: true, empty: false, value: value };
  }

  function readContact() {
    var org = clean(orgInput.value);
    var title = clean(titleInput.value);
    var first = clean(firstInput.value);
    var last = clean(lastInput.value);
    var phoneRaw = phoneInput.value;
    var emailRaw = emailInput.value;
    var phone = normalizePhone(phoneRaw);
    var email = normalizeEmail(emailRaw);
    var person = [first, last].filter(Boolean).join(" ");
    var fullName = person || org;
    var valid = Boolean(fullName) && phone.ok && email.ok;
    var message = "Ad ve telefon yazılınca kod burada oluşur.";
    var state = "idle";
    var untouched = !fullName && !title && phone.empty && email.empty && !photo.base64;

    if (untouched) {
      state = "idle";
    } else if (!fullName) {
      state = "error";
      message = "Kaydetmek için ad ya da şirket adı yazın.";
    } else if (phone.empty) {
      state = "error";
      message = "Telefon numarasını yazın.";
    } else if (!phone.ok) {
      state = "error";
      message = phone.reason;
    } else if (!email.ok) {
      state = "error";
      message = email.reason;
    } else {
      state = "ready";
      message = "Kod hazır. Kamerayla okutulunca kişi kartı açılır. Rehbere " + phone.display + " olarak kaydedilir.";
    }

    return {
      org: org,
      title: title,
      first: first,
      last: last,
      person: person,
      fullName: fullName,
      phone: phone,
      phoneRaw: phoneRaw.trim(),
      email: email.ok ? email.value : "",
      emailRaw: emailRaw.trim(),
      photo: photo.base64,
      valid: valid,
      message: message,
      state: state,
      vcard: valid ? buildVCard({
        org: org,
        title: title,
        first: first,
        last: last,
        fullName: fullName,
        e164: phone.e164,
        email: email.value,
        photo: photo.base64
      }) : ""
    };
  }

  function buildVCard(contact) {
    var family = contact.last || (!contact.first ? contact.org : "");
    var lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:" + esc(family) + ";" + esc(contact.first) + ";;;",
      "FN:" + esc(contact.fullName)
    ];
    if (contact.org) lines.push("ORG:" + esc(contact.org));
    if (contact.title) lines.push("TITLE:" + esc(contact.title));
    lines.push("TEL;TYPE=CELL:" + contact.e164);
    if (contact.email) lines.push("EMAIL;TYPE=INTERNET:" + esc(contact.email));
    if (contact.photo) lines.push("PHOTO;ENCODING=b;TYPE=PNG:" + contact.photo);
    lines.push("END:VCARD");
    return lines.join("\r\n") + "\r\n";
  }

  function makeQr(text, level) {
    qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
    var chosen = level || (text.indexOf("PHOTO;") >= 0 ? "L" : "M");
    var qr = qrcode(0, chosen);
    qr.addData(text);
    qr.make();
    return qr;
  }

  function makeFittedQr(text, withLogo) {
    var levels = withLogo ? ["H", "Q", "M"] : [text.indexOf("PHOTO;") >= 0 ? "L" : "M"];
    var i, lastError;
    for (i = 0; i < levels.length; i++) {
      try {
        return { qr: makeQr(text, levels[i]), level: levels[i] };
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  function modulesForPhoto(b64) {
    var extra = "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM";
    var text = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:" + extra + ";" + extra + ";;;",
      "FN:" + extra,
      "ORG:" + extra,
      "TITLE:" + extra,
      "TEL;TYPE=CELL:+905551112233",
      "EMAIL;TYPE=INTERNET:kisi@ornek.com",
      "PHOTO;ENCODING=b;TYPE=PNG:" + b64,
      "END:VCARD"
    ].join("\r\n") + "\r\n";
    try {
      return makeQr(text).getModuleCount();
    } catch (err) {
      return 999;
    }
  }

  function compressPhoto(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var side = Math.min(img.width, img.height);
        var sx = (img.width - side) / 2;
        var sy = (img.height - side) / 2;
        var sizes = [40, 32, 28, 24];
        var options = [];
        var s, p, imageData, pixels;
        for (s = 0; s < sizes.length; s++) {
          var canvasShot = document.createElement("canvas");
          canvasShot.width = sizes[s];
          canvasShot.height = sizes[s];
          var ctx = canvasShot.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, sizes[s], sizes[s]);
          ctx.drawImage(img, sx, sy, side, side, 0, 0, sizes[s], sizes[s]);
          imageData = ctx.getImageData(0, 0, sizes[s], sizes[s]);
          pixels = imageData.data;
          for (p = 0; p < pixels.length; p += 4) {
            pixels[p] = pixels[p] & 192;
            pixels[p + 1] = pixels[p + 1] & 192;
            pixels[p + 2] = pixels[p + 2] & 192;
          }
          ctx.putImageData(imageData, 0, 0);
          options.push(canvasShot.toDataURL("image/png"));
        }
        options.sort(function (a, b) {
          return b.length - a.length;
        });
        var i;
        for (i = 0; i < options.length; i++) {
          var b64 = options[i].split(",")[1] || "";
          if (modulesForPhoto(b64) <= 97) {
            resolve(options[i]);
            return;
          }
        }
        resolve(options[options.length - 1]);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("photo"));
      };
      img.src = url;
    });
  }

  function clearPhoto() {
    if (photo.previewUrl.indexOf("blob:") === 0) URL.revokeObjectURL(photo.previewUrl);
    photo.base64 = "";
    photo.previewUrl = "";
    photoInput.value = "";
    photoAdd.classList.remove("is-set");
    photoAdd.textContent = "Görsel seç";
    photoRemove.hidden = true;
  }

  function renderAvatar() {
    if (photo.previewUrl) {
      passPhoto.hidden = false;
      passPhoto.src = photo.previewUrl;
      passPhoto.alt = "Kişi fotoğrafı";
      return;
    }
    passPhoto.hidden = true;
    passPhoto.removeAttribute("src");
    passPhoto.alt = "";
  }

  function currentLook() {
    var size = Number(logoSizeInput.value);
    if (isNaN(size)) size = 40;
    return {
      fg: fgInput.value || "#10241c",
      bg: bgInput.value || "#ffffff",
      transparent: clearButton.getAttribute("aria-pressed") === "true",
      logoImage: logo.image,
      logoRatio: 0.15 + (size / 100) * 0.09,
      logoRound: logoRoundButton.getAttribute("aria-pressed") === "true"
    };
  }

  function invertHex(hex) {
    var n = String(hex || "#000000").replace("#", "");
    if (n.length === 3) {
      n = n.charAt(0) + n.charAt(0) + n.charAt(1) + n.charAt(1) + n.charAt(2) + n.charAt(2);
    }
    var r = (255 - parseInt(n.slice(0, 2), 16)).toString(16).padStart(2, "0");
    var g = (255 - parseInt(n.slice(2, 4), 16)).toString(16).padStart(2, "0");
    var b = (255 - parseInt(n.slice(4, 6), 16)).toString(16).padStart(2, "0");
    return "#" + r + g + b;
  }

  function withLogo(look, colors) {
    colors.logoImage = look.logoImage;
    colors.logoRatio = look.logoRatio;
    colors.logoRound = look.logoRound;
    return colors;
  }

  function invertedLook(look) {
    if (look.transparent) {
      return withLogo(look, { fg: invertHex(look.fg), bg: look.bg, transparent: true });
    }
    return withLogo(look, { fg: look.bg, bg: look.fg, transparent: false });
  }

  function setTransparent(on) {
    clearButton.setAttribute("aria-pressed", on ? "true" : "false");
    bgInput.disabled = on;
    bgField.classList.toggle("is-off", on);
  }

  function previewCss(cells) {
    var wanted = cells * 5;
    var limit = Math.min(640, Math.max(300, window.innerWidth - 48));
    return Math.max(280, Math.min(limit, wanted));
  }

  function paint(qr, targetCanvas, cssSize, forFile, look, level) {
    var count = qr.getModuleCount();
    var margin = 4;
    var cells = count + margin * 2;
    var scale;
    if (forFile) {
      scale = Math.max(12, Math.ceil(1600 / cells));
    } else {
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      var fitted = previewCss(cells);
      scale = Math.max(1, Math.floor((Math.max(cssSize, fitted) * dpr) / cells));
    }
    var px = scale * cells;
    targetCanvas.width = px;
    targetCanvas.height = px;
    if (!forFile) {
      var shown = Math.round(px / Math.min(window.devicePixelRatio || 1, 3));
      targetCanvas.style.width = shown + "px";
      targetCanvas.style.height = shown + "px";
    }
    var ctx = targetCanvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, px, px);
    if (!look.transparent) {
      ctx.fillStyle = look.bg;
      ctx.fillRect(0, 0, px, px);
    }
    ctx.fillStyle = look.fg;
    for (var y = 0; y < count; y++) {
      for (var x = 0; x < count; x++) {
        if (qr.isDark(y, x)) {
          ctx.fillRect((x + margin) * scale, (y + margin) * scale, scale, scale);
        }
      }
    }
    if (look.logoImage) drawCenterLogo(ctx, count, margin, scale, look, level);
    return targetCanvas;
  }

  function logoCap(level) {
    if (level === "H") return 0.24;
    if (level === "Q") return 0.18;
    return 0.14;
  }

  function roundPath(ctx, x, y, w, h, r) {
    var radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawCenterLogo(ctx, count, margin, scale, look, level) {
    var area = count * scale;
    var origin = margin * scale;
    var ratio = Math.min(look.logoRatio || 0.18, logoCap(level));
    var logoSize = Math.max(scale * 3, Math.round((area * ratio) / scale) * scale);
    var pad = Math.max(scale, Math.round((logoSize * 0.16) / scale) * scale);
    var plate = logoSize + pad * 2;
    var x = origin + Math.round((area - plate) / 2 / scale) * scale;
    var y = origin + Math.round((area - plate) / 2 / scale) * scale;
    var radius = look.logoRound ? plate / 2 : Math.round(plate * 0.16);
    var plateColor = look.transparent ? "#ffffff" : look.bg;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    roundPath(ctx, x, y, plate, plate, radius);
    ctx.fillStyle = plateColor;
    ctx.fill();
    roundPath(ctx, x + pad, y + pad, logoSize, logoSize, look.logoRound ? logoSize / 2 : Math.round(radius * 0.75));
    ctx.clip();
    var iw = look.logoImage.naturalWidth || look.logoImage.width;
    var ih = look.logoImage.naturalHeight || look.logoImage.height;
    var cover = Math.max(logoSize / iw, logoSize / ih);
    var dw = iw * cover;
    var dh = ih * cover;
    ctx.drawImage(look.logoImage, x + pad + (logoSize - dw) / 2, y + pad + (logoSize - dh) / 2, dw, dh);
    ctx.restore();
  }

  function setLine(el, value, placeholder) {
    el.textContent = value || placeholder;
    el.classList.toggle("is-placeholder", !value);
  }

  function renderPhone(contact) {
    phoneEl.textContent = "";
    if (contact.phone.ok) {
      var link = document.createElement("a");
      link.href = "tel:" + contact.phone.e164;
      link.textContent = contact.phone.display;
      phoneEl.appendChild(link);
      phoneEl.classList.remove("is-placeholder");
      return;
    }
    phoneEl.textContent = contact.phoneRaw || "Telefon";
    phoneEl.classList.add("is-placeholder");
  }

  function showOptional(el, value, placeholder, showPlaceholder) {
    if (value) {
      el.hidden = false;
      setLine(el, value, "");
      return;
    }
    if (showPlaceholder) {
      el.hidden = false;
      setLine(el, "", placeholder);
      return;
    }
    el.hidden = true;
    el.textContent = "";
  }

  function renderEmail(contact, showPlaceholder) {
    emailEl.textContent = "";
    if (contact.email) {
      var link = document.createElement("a");
      link.href = "mailto:" + contact.email;
      link.textContent = contact.email;
      emailEl.appendChild(link);
      emailEl.classList.remove("is-placeholder");
      emailEl.hidden = false;
      return;
    }
    if (showPlaceholder || contact.emailRaw) {
      emailEl.hidden = false;
      emailEl.textContent = contact.emailRaw || "E-posta";
      emailEl.classList.add("is-placeholder");
      return;
    }
    emailEl.hidden = true;
  }

  function render() {
    var contact = readContact();
    var started = Boolean(contact.fullName || contact.title || contact.phoneRaw || contact.emailRaw || contact.photo);

    renderAvatar();
    passEl.classList.toggle("has-photo", Boolean(contact.photo));
    var look = currentLook();
    statusEl.textContent = contact.message;
    statusEl.dataset.state = contact.state;
    pngButton.disabled = !contact.valid;
    clearPngButton.disabled = !contact.valid;
    invertPngButton.disabled = !contact.valid;
    vcfButton.disabled = !contact.valid;
    printButton.disabled = !contact.valid;
    pngButton.textContent = look.transparent ? "Şeffaf QR’ı indir" : "QR’ı indir";
    passEl.dataset.vcard = contact.vcard;

    if (!started) {
      setLine(nameEl, "", "Ad Soyad");
      showOptional(titleEl, "", "Ünvan", true);
      showOptional(orgEl, "", "Şirket", true);
      setLine(phoneEl, "", "Telefon");
      phoneEl.hidden = false;
      renderEmail(contact, true);
    } else {
      setLine(nameEl, contact.person || contact.org, "Ad Soyad");
      showOptional(titleEl, contact.title, "Ünvan", false);
      showOptional(orgEl, contact.person ? contact.org : "", "Şirket", false);
      renderPhone(contact);
      phoneEl.hidden = false;
      renderEmail(contact, false);
    }

    if (!contact.valid) {
      emptyEl.hidden = false;
      canvas.hidden = true;
      canvas.classList.remove("is-clear");
      canvas.removeAttribute("aria-label");
      return contact;
    }

    try {
      var fitted = makeFittedQr(contact.vcard, Boolean(look.logoImage));
      paint(fitted.qr, canvas, previewSize, false, look, fitted.level);
      emptyEl.hidden = true;
      canvas.hidden = false;
      canvas.classList.toggle("is-clear", look.transparent);
      canvas.setAttribute("aria-label", contact.fullName + " kişi kartı QR kodu");
    } catch (err) {
      emptyEl.hidden = false;
      canvas.hidden = true;
      canvas.classList.remove("is-clear");
      statusEl.textContent = contact.photo
        ? "Fotoğraf kodu çok büyütüyor. Görseli kaldırıp yeniden deneyin."
        : "Bu bilgiler kod için fazla uzun. Adı veya şirket adını kısaltın.";
      statusEl.dataset.state = "error";
      pngButton.disabled = true;
      clearPngButton.disabled = true;
      invertPngButton.disabled = true;
      vcfButton.disabled = true;
      printButton.disabled = true;
    }

    return contact;
  }

  function fileSlug(contact) {
    var base = contact.person || contact.org || "kisi";
    var slug = base
      .toLocaleLowerCase("tr-TR")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return slug || "kisi";
  }

  function download(href, filename) {
    var link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function savePng(look, suffix) {
    var contact = readContact();
    if (!contact.valid) return;
    var fitted = makeFittedQr(contact.vcard, Boolean(look.logoImage));
    var fileCanvas = document.createElement("canvas");
    paint(fitted.qr, fileCanvas, 0, true, look, fitted.level);
    download(fileCanvas.toDataURL("image/png"), fileSlug(contact) + suffix + ".png");
  }

  pngButton.addEventListener("click", function () {
    var look = currentLook();
    savePng(look, look.transparent ? "-seffaf" : "-qr");
  });

  clearPngButton.addEventListener("click", function () {
    var look = currentLook();
    savePng(withLogo(look, { fg: look.fg, bg: look.bg, transparent: true }), "-seffaf");
  });

  invertPngButton.addEventListener("click", function () {
    savePng(invertedLook(currentLook()), "-ters");
  });

  monoButton.addEventListener("click", function () {
    fgInput.value = "#111111";
    bgInput.value = "#ffffff";
    setTransparent(false);
    render();
  });

  invertButton.addEventListener("click", function () {
    var next = invertedLook(currentLook());
    fgInput.value = next.fg;
    bgInput.value = next.bg;
    setTransparent(next.transparent);
    render();
  });

  clearButton.addEventListener("click", function () {
    setTransparent(clearButton.getAttribute("aria-pressed") !== "true");
    render();
  });

  vcfButton.addEventListener("click", function () {
    var contact = readContact();
    if (!contact.valid) return;
    var blob = new Blob([contact.vcard], { type: "text/vcard;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    download(url, fileSlug(contact) + ".vcf");
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  printButton.addEventListener("click", function () {
    if (printButton.disabled) return;
    window.print();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
  });

  form.addEventListener("input", render);
  photoInput.addEventListener("change", function () {
    var file = photoInput.files && photoInput.files[0];
    if (!file) {
      clearPhoto();
      render();
      return;
    }
    statusEl.textContent = "Fotoğraf hazırlanıyor…";
    statusEl.dataset.state = "idle";
    compressPhoto(file).then(function (dataUrl) {
      if (photo.previewUrl.indexOf("blob:") === 0) URL.revokeObjectURL(photo.previewUrl);
      photo.previewUrl = URL.createObjectURL(file);
      photo.base64 = dataUrl.split(",")[1] || "";
      photoAdd.classList.add("is-set");
      photoAdd.textContent = "Görsel seçildi";
      photoRemove.hidden = false;
      render();
    }).catch(function () {
      clearPhoto();
      render();
      statusEl.textContent = "Bu görsel okunamadı. JPG veya PNG seçin.";
      statusEl.dataset.state = "error";
    });
  });

  photoRemove.addEventListener("click", function () {
    clearPhoto();
    render();
  });

  function setLogoControls(on) {
    logoSizeInput.disabled = !on;
    logoRoundButton.disabled = !on;
    logoSizeField.classList.toggle("is-off", !on);
    logoAdd.classList.toggle("is-set", on);
    logoAdd.textContent = on ? "Logo seçildi" : "Logo seç";
    logoRemove.hidden = !on;
  }

  function clearLogo() {
    if (logo.url) URL.revokeObjectURL(logo.url);
    logo.image = null;
    logo.url = "";
    logoInput.value = "";
    logoRoundButton.setAttribute("aria-pressed", "false");
    setLogoControls(false);
  }

  logoInput.addEventListener("change", function () {
    var file = logoInput.files && logoInput.files[0];
    if (!file) {
      clearLogo();
      render();
      return;
    }
    var url = URL.createObjectURL(file);
    var image = new Image();
    image.onload = function () {
      if (logo.url) URL.revokeObjectURL(logo.url);
      logo.image = image;
      logo.url = url;
      setLogoControls(true);
      render();
    };
    image.onerror = function () {
      URL.revokeObjectURL(url);
      clearLogo();
      render();
      statusEl.textContent = "Bu logo okunamadı. PNG veya JPG seçin.";
      statusEl.dataset.state = "error";
    };
    image.src = url;
  });

  logoRemove.addEventListener("click", function () {
    clearLogo();
    render();
  });

  logoRoundButton.addEventListener("click", function () {
    if (logoRoundButton.disabled) return;
    var on = logoRoundButton.getAttribute("aria-pressed") !== "true";
    logoRoundButton.setAttribute("aria-pressed", on ? "true" : "false");
    render();
  });

  form.addEventListener("reset", function () {
    setTimeout(function () {
      setTransparent(false);
      clearPhoto();
      clearLogo();
      render();
    }, 0);
  });

  render();
})();
