import $ from 'jquery';

export class ShareBox {
  hideTimeout = 5000;
  slideAnimationDuration = 500;

  constructor(firebaseManager, eventAggregator) {
    this.firebaseManager = firebaseManager;
    this.eventAggregator = eventAggregator;
  }

  attached() {
    let firebaseManager = this.firebaseManager;
    let shareEventsFirebase = firebaseManager.makeShareEventsFirebase();

    firebaseManager.makeShareChildrenFirebase().limitToLast(1).on('child_added', function child_added(snapshot) {
      let data = snapshot.val();
      if (!data) {
        return;
      }

      $("#shareButton label")
        .css("display", "none")
        .fadeOut(50)
        .fadeIn(450);
      shareEventsFirebase.push({event: 'shareLinkUsed', timestamp: firebaseManager.SERVER_TIMESTAMP});
    });

    this.shareURL = 'https://seecode.run/#:' + this.firebaseManager.pastebinId;
    let copyTarget = document.getElementById("copyTarget");
    copyTarget.value = this.shareURL;

    let self = this;
    let toggleShareBox = function toggleShareBox() {
      if ($("#shareBox").is(":visible")) {
        $("#shareButton span").removeClass("navigation-bar-active-item");
        $("#shareButton label").removeClass("navigation-bar-active-item");
      } else {
        self.eventAggregator.publish("shareBoxShown");
        $("#shareButton span").addClass("navigation-bar-active-item");
        $("#shareButton label").addClass("navigation-bar-active-item");
        clearTimeout(self.toggleShareBoxTimeout);
        shareEventsFirebase.push({event: 'shareLinkShown', timestamp: firebaseManager.SERVER_TIMESTAMP});
      }
      $("#shareBox").toggle("slide", {direction: "right"}, self.slideAnimationDuration);
    };

    $('#shareBox').hide();
    $('#shareButton').click(toggleShareBox);

    self.eventAggregator.subscribe("historyBoxShown", ()=> {
      if ($("#shareBox").is(":visible")) {
        $("#shareButton span").removeClass("navigation-bar-active-item");
        $("#shareButton label").removeClass("navigation-bar-active-item");
        $("#shareBox").toggle();
      }
    });

    $('#shareListItem').mouseenter(function shareListItemMouseEnter() {
      clearTimeout(self.toggleShareBoxTimeout);
    }).mouseleave(function shareListItemMouseLeave() {
      clearTimeout(self.toggleShareBoxTimeout);
      self.toggleShareBoxTimeout = setTimeout(function(){
        if($("#shareBox").is(":visible")) {
            toggleShareBox();
          }
        }, self.hideTimeout);
    });

    let $copyButton = $("#copyButton");

    $copyButton.click(function copyButtonClick() {
      let copyTarget = document.getElementById("copyTarget");
      self.copyToClipboard(copyTarget);
      shareEventsFirebase.push({event: 'shareLinkCopied', timestamp: firebaseManager.SERVER_TIMESTAMP});
    });

    let $goToShareButton = $("#goToShareButton");
    $goToShareButton.click(function goToSharedPastebin() {
      window.open(self.shareURL, '_blank');
      shareEventsFirebase.push({event: 'shareLinkClicked', timestamp: firebaseManager.SERVER_TIMESTAMP});
    });
  }

  copyToClipboard(elem) {
    let target = undefined;
    let targetId = "_hiddenCopyText_";
    let isInput = elem.tagName === "INPUT" || elem.tagName === "TEXTAREA";
    let origSelectionStart, origSelectionEnd;
    if (isInput) {
      target = elem;
      origSelectionStart = elem.selectionStart;
      origSelectionEnd = elem.selectionEnd;
    }
    else {
      target = document.getElementById(targetId);
      if (!target) {
        target = document.createElement("textarea");
        target.style.position = "absolute";
        target.style.left = "-9999px";
        target.style.top = "0";
        target.id = targetId;
        document.body.appendChild(target);
      }
      target.textContent = elem.textContent;
    }
    let currentFocus = document.activeElement;
    target.focus();
    target.setSelectionRange(0, target.value.length);

    let succeed;
    try {
      succeed = document.execCommand("copy");
    }
    catch (e) {
      succeed = false;
    }

    if (currentFocus && typeof currentFocus.focus === "function") {
      currentFocus.focus();
    }

    if (isInput) {

      elem.setSelectionRange(origSelectionStart, origSelectionEnd);
    }
    else {

      target.textContent = "";
    }
    return succeed;
  }
}
