class Modix {
  static elements = [];

  constructor(options = {}) {
    if (!options.content && !options.templateId) {
      console.error("You must provide one of 'content' or 'templateId'.");
      return;
    }

    if (options.content && options.templateId) {
      options.templateId = null;
      console.warn(
        "Both 'content' and 'templateId' are specified. 'content' will take precedence.",
      );
    }

    if (options.templateId) {
      this.template = document.querySelector(`#${options.templateId}`);

      if (!this.template) {
        console.error(`#${options.templateId} does not exist!`);
        return;
      }
    }

    this.opt = Object.assign(
      {
        enableScrollLock: true,
        destroyOnClose: true,
        footer: false,
        cssClass: [],
        closeMethods: ["button", "overlay", "escape"],
        scrollLockTarget: () => document.body,
      },
      options,
    );

    this.content = this.opt.content;

    const { closeMethods } = this.opt;

    this._modixAllowButtonClose = closeMethods.includes("button");
    this._modixAllowBackdropClose = closeMethods.includes("overlay");
    this._modixAllowEscapeClose = closeMethods.includes("escape");

    this._modixFooterButtons = [];
  }

  _modixBuild() {
    const contentNode = this.content
      ? document.createElement("div")
      : this.template.content.cloneNode(true);

    if (this.content) {
      contentNode.innerHTML = this.content;
    }

    this._modixBackdrop = document.createElement("div");
    this._modixBackdrop.className = "modix";

    const container = document.createElement("div");
    container.className = "modix__container";

    this.opt.cssClass.forEach((className) => {
      if (typeof className === "string") {
        container.classList.add(className);
      }
    });

    if (this._modixAllowButtonClose) {
      const closeBtn = this._modixCreateButton("&times;", "modix__close", () =>
        this.close(),
      );

      container.append(closeBtn);
    }

    this._modixContent = document.createElement("div");
    this._modixContent.className = "modix__content";

    this._modixContent.append(contentNode);
    container.append(this._modixContent);

    if (this.opt.footer) {
      this._modixFooter = document.createElement("div");
      this._modixFooter.className = "modix__footer";

      this._modixRenderFooterContent();
      this._modixRenderFooterButtons();

      container.append(this._modixFooter);
    }

    this._modixBackdrop.append(container);
    document.body.append(this._modixBackdrop);
  }

  setContent(content) {
    this.content = content;

    if (this._modixContent) {
      this._modixContent.innerHTML = this.content;
    }
  }

  setFooterContent(content) {
    this._modixFooterContent = content;
    this._modixRenderFooterContent();
  }

  addFooterButton(title, cssClass, callback) {
    const button = this._modixCreateButton(title, cssClass, callback);

    this._modixFooterButtons.push(button);
    this._modixRenderFooterButtons();
  }

  _modixRenderFooterContent() {
    if (this._modixFooter && this._modixFooterContent) {
      this._modixFooter.innerHTML = this._modixFooterContent;
    }
  }

  _modixRenderFooterButtons() {
    if (this._modixFooter) {
      this._modixFooterButtons.forEach((button) => {
        this._modixFooter.append(button);
      });
    }
  }

  _modixCreateButton(title, cssClass, callback) {
    const button = document.createElement("button");

    button.className = cssClass;
    button.innerHTML = title;
    button.onclick = callback;

    return button;
  }

  open() {
    Modix.elements.push(this);

    if (!this._modixBackdrop) {
      this._modixBuild();
    }

    setTimeout(() => {
      this._modixBackdrop.classList.add("modix--show");
    }, 0);

    if (Modix.elements.length === 1 && this.opt.enableScrollLock) {
      const target = this.opt.scrollLockTarget();

      if (this._modixHasScrollbar(target)) {
        target.classList.add("modix--no-scroll");

        const targetPadRight = parseFloat(
          getComputedStyle(target).paddingRight,
        );

        target.style.paddingRight =
          targetPadRight + this._modixGetScrollbarWidth() + "px";
      }
    }

    if (this._modixAllowBackdropClose) {
      this._modixBackdrop.onclick = (e) => {
        if (e.target === this._modixBackdrop) {
          this.close();
        }
      };
    }

    if (this._modixAllowEscapeClose) {
      document.addEventListener("keydown", this._modixHandleEscapeKey);
    }

    this._modixOnTransitionEnd(this.opt.onOpen);

    return this._modixBackdrop;
  }

  _modixHasScrollbar(target) {
    if ([document.documentElement, document.body].includes(target)) {
      return (
        document.documentElement.scrollHeight >
          document.documentElement.clientHeight ||
        document.body.scrollHeight > document.body.clientHeight
      );
    }

    return target.scrollHeight > target.clientHeight;
  }

  _modixHandleEscapeKey = (e) => {
    const lastModal = Modix.elements[Modix.elements.length - 1];

    if (e.key === "Escape" && this === lastModal) {
      this.close();
    }
  };

  _modixOnTransitionEnd(callback) {
    this._modixBackdrop.ontransitionend = (e) => {
      if (e.propertyName !== "transform") return;

      if (typeof callback === "function") callback();
    };
  }

  close(destroy = this.opt.destroyOnClose) {
    Modix.elements.pop();

    this._modixBackdrop.classList.remove("modix--show");

    if (this._modixAllowEscapeClose) {
      document.removeEventListener("keydown", this._modixHandleEscapeKey);
    }

    this._modixOnTransitionEnd(() => {
      if (this._modixBackdrop && destroy) {
        this._modixBackdrop.remove();
        this._modixBackdrop = null;
        this._modixFooter = null;
      }

      if (this.opt.enableScrollLock && !Modix.elements.length) {
        const target = this.opt.scrollLockTarget();

        if (this._modixHasScrollbar(target)) {
          target.classList.remove("modix--no-scroll");
          target.style.paddingRight = "";
        }
      }

      if (typeof this.opt.onClose === "function") {
        this.opt.onClose();
      }
    });
  }

  destroy() {
    this.close(true);
  }

  _modixGetScrollbarWidth() {
    if (this._modixScrollbarWidth) return this._modixScrollbarWidth;

    const div = document.createElement("div");

    Object.assign(div.style, {
      overflow: "scroll",
      position: "absolute",
      top: "-9999px",
    });

    document.body.appendChild(div);

    this._modixScrollbarWidth = div.offsetWidth - div.clientWidth;

    document.body.removeChild(div);

    return this._modixScrollbarWidth;
  }
}
