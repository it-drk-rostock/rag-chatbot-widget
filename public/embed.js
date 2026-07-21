(function () {
  var script = document.currentScript;
  var scriptUrl = script && script.getAttribute("src");
  if (!scriptUrl) return;

  var widgetOrigin = new URL(scriptUrl, window.location.origin).origin;
  var iframe = document.createElement("iframe");
  var bubble = document.createElement("button");
  var open = false;
  var loaded = false;

  bubble.setAttribute("type", "button");
  bubble.setAttribute("aria-label", "Open chat");
  bubble.textContent = "Chat";
  bubble.style.cssText = "background:#228be6;border:0;border-radius:50%;bottom:20px;color:#fff;cursor:pointer;font:14px sans-serif;height:60px;position:fixed;right:20px;width:60px;z-index:2147483647";

  iframe.setAttribute("title", "Chat");
  iframe.style.cssText = "border:0;border-radius:16px;bottom:20px;box-shadow:0 8px 30px rgba(0,0,0,.2);height:60px;opacity:0;pointer-events:none;position:fixed;right:20px;transition:height .2s,width .2s,opacity .2s;width:60px;z-index:2147483646";
  iframe.style.width = "60px";
  iframe.style.height = "60px";

  function setOpen(nextOpen) {
    open = nextOpen;
    if (open && !loaded) {
      iframe.setAttribute("src", widgetOrigin + "/widget?parentOrigin=" + encodeURIComponent(window.location.origin));
      loaded = true;
    }
    iframe.style.width = open ? "380px" : "60px";
    iframe.style.height = open ? "600px" : "60px";
    iframe.style.opacity = open ? "1" : "0";
    iframe.style.pointerEvents = open ? "auto" : "none";
    bubble.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    bubble.textContent = open ? "Close" : "Chat";
    if (iframe.contentWindow && iframe.contentWindow.postMessage) {
      iframe.contentWindow.postMessage({ type: "rag-chatbot:toggle", open: open }, widgetOrigin);
    }
  }

  bubble.addEventListener("click", function () { setOpen(!open); });
  window.addEventListener("message", function (event) {
    if (event.origin === widgetOrigin && event.source === iframe.contentWindow && event.data && event.data.type === "rag-chatbot:resize") {
      setOpen(event.data.open === true);
    }
  });

  document.body.appendChild(bubble);
  document.body.appendChild(iframe);
}());
