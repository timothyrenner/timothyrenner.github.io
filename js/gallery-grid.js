(() => {
  // <stdin>
  var $activeElem = false;
  var timeout = 0;
  var $gallery = document.querySelector(".grid-gallery");
  var $grid = document.querySelector(".grid-gallery ul");
  var note = document.createElement("p");
  note.innerHTML = "Press <kbd>Return</kbd> to zoom images and <kbd>Esc</kbd> to exit zoomed images.";
  note.classList.add("key-note");
  note.setAttribute("tabindex", "0");
  $grid.parentNode.insertBefore(note, $grid);
  var scaleFactor = getComputedStyle($gallery).getPropertyValue(
    "--grid-gallery-scale-factor"
  );
  var getTimeouts = () => {
    const durationOn = parseFloat(
      getComputedStyle($gallery).getPropertyValue(
        "--grid-gallery-duration-expand"
      )
    );
    timeout = parseFloat(durationOn) * 100;
  };
  var getTop = ($elem) => {
    const elemRect = $elem.getBoundingClientRect();
    return elemRect.top;
  };
  var setDataAttrs = ($elems, $parent) => {
    let top = getTop($elems[0]);
    const eStyle = getComputedStyle($elems[0]);
    $parent.setAttribute("data-width", eStyle.width);
    for (let i = 0; i < $elems.length; i++) {
      let button = $elems[i].querySelector("button");
      button.setAttribute("aria-expanded", false);
      const t = getTop($elems[i]);
      if (t != top) {
        $parent.setAttribute("data-cols", i);
        break;
      }
    }
  };
  var deactiveElems = ($elems, $parent, $currentElem, $button) => {
    $parent.classList.remove("is-zoomed");
    for (let i = 0; i < $elems.length; i++) {
      $elems[i].classList.remove("is-zoomed");
      $elems[i].style.transform = "none";
      if ($elems[i] === $currentElem) {
        continue;
      }
      if ($button) {
        $button.setAttribute("aria-expanded", false);
      }
      setTimeout(() => {
        $elems[i].style.zIndex = 0;
      }, timeout);
    }
  };
  var activateElem = ($elems, $parent, $elem, $button, lengthOfElems, i) => {
    const cols = parseInt($parent.getAttribute("data-cols"));
    const width = parseFloat($parent.getAttribute("data-width"));
    if (cols === 1) {
      return;
    }
    const rows = Math.ceil(lengthOfElems / cols) - 1;
    if (rows === 0) {
      return;
    }
    deactiveElems($elems, $parent, $elem, $button);
    if ($activeElem) {
      $activeElem.focus();
      $activeElem = false;
      return;
    }
    let transformOrigin = "center";
    const isFirstRow = i < cols;
    if (isFirstRow) {
      transformOrigin = "top";
    }
    const isLastRow = i + 1 > rows * cols;
    if (isLastRow) {
      transformOrigin = "bottom";
    }
    const curColumn = i % cols + 1;
    let isFirstCol = false;
    let isLastCol = false;
    let isRemainder = false;
    if (curColumn === 1) {
      isFirstCol = true;
    }
    if (curColumn === cols) {
      isLastCol = true;
    }
    if (isLastRow) {
      if (lengthOfElems % cols !== 0) {
        isRemainder = true;
      }
    }
    if (isFirstCol) {
      if (!isRemainder) {
        transformOrigin += " left";
      } else {
        transformOrigin += " center";
      }
    } else if (isLastCol) {
      transformOrigin += " right";
    } else {
      transformOrigin += " center";
    }
    $elem.style.transformOrigin = transformOrigin;
    const scale = width * scaleFactor / width;
    setTimeout(() => {
      $elem.style.zIndex = 100;
      $parent.classList.add("is-zoomed");
      $elem.classList.add("is-zoomed");
      $elem.style.transform = `scale(${scale})`;
      $button.setAttribute("aria-expanded", true);
      $activeElem = $button;
    }, timeout);
  };
  var activateSibling = ($sibling) => {
    const $siblingButton = $sibling.querySelector("button");
    $activeElem = false;
    $siblingButton.focus();
    $siblingButton.click();
  };
  var setClicks = ($elems, $parent) => {
    $elems.forEach(($elem, i) => {
      const $button = $elem.querySelector("button");
      $button.addEventListener("click", (e) => {
        activateElem($elems, $parent, $elem, $button, $elems.length, i);
      });
    });
  };
  var setKeyboardEvents = () => {
    document.addEventListener("keydown", (e) => {
      if ($activeElem) {
        if (e.code === "Escape") {
          $activeElem.click();
        }
        if (e.code === "ArrowLeft") {
          const $previousSibling = $activeElem.parentNode.previousElementSibling;
          if ($previousSibling) {
            activateSibling($previousSibling);
          }
        }
        if (e.code === "ArrowRight") {
          const $nextSibling = $activeElem.parentNode.nextElementSibling;
          if ($nextSibling) {
            activateSibling($nextSibling);
          }
        }
      }
    });
  };
  var setResizeEvents = ($elems, $parent) => {
    window.addEventListener("resize", () => {
      setDataAttrs($elems, $parent);
      deactiveElems($elems, $parent);
    });
  };
  if ($grid) {
    const $items = $grid.querySelectorAll("li");
    if ($items.length) {
      getTimeouts($items);
      setDataAttrs($items, $grid);
      setClicks($items, $grid);
      setKeyboardEvents();
      setResizeEvents($items, $grid);
    }
  }
})();
