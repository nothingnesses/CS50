let docum = {};
let wind = {};
let docheight = 0;
let guiheight = 0;
let pcalcmay = 0;
let xpos = 0;
let ypos = 0;
export let maxRows = 8;
export let gui = {};
export let genericStyle = { position: "absolute", zIndex: 11, backgroundColor: "#f1f1f1", border: "2px solid var(--my-highlight-color)",
    textAlign: "center", width: "350px" };
export let headerStyle = { cursor: "move", zIndex: 12, backgroundColor: "#222", color: "#e6e6e6",
    display: "flex", flexDirection: "row", height: "30px" };
export let optionsStyle = { boxSizing: "border-box", backgroundColor: "#555", color: "#faffdf", height: "26px",
    lineHeight: "24px", boxShadow: "inset 0 0em 0 0.1em rgba(0,0,0,0.20)", cursor: "pointer" };
export async function initialize(ns, htmldoc, htmlwin) {
    docum = htmldoc;
    wind = htmlwin;
    const game = docum.getElementById("entire-game-container");
    game.appendChild(newElement("div", "extraGUI", genericStyle));
    gui = docum.getElementById("extraGUI");
    const headerContainer = newElement("div", "extraGUIcontainer1", headerStyle);
    headerContainer.appendChild(newElement("div", "extraGUIheader", { flex: 0.9, marginTop: "5px", borderBottom: "2px solid var(--my-highlight-color)",
        lineHeight: "normal" }, "Movable Command Center"));
    headerContainer.appendChild(newElement("div", "extraGUIclose", { lineHeight: "30px", flex: 0.1, borderLeft: "2px solid var(--my-highlight-color)",
        borderBottom: "2px solid var(--my-highlight-color)", cursor: "pointer" }, "X"));
    gui.appendChild(headerContainer);
    const headerClose = docum.getElementById("extraGUIclose");
    headerClose.onclick = (e) => closeGUI(e, ns);
    dragElement();
    calcHeight();
}
function calcHeight() {
    docheight = docum.documentElement.scrollHeight;
    guiheight = parseInt(gui.clientHeight, 10);
    pcalcmay = docheight - guiheight - 4;
}
export function verifyHeight() {
    if (parseInt(gui.clientHeight, 10) > guiheight
        && pcalcmay < parseInt(gui.style.top, 10) + parseInt(gui.clientHeight, 10) + 4) {
        gui.style.top = (docheight - parseInt(gui.clientHeight, 10) - 4) + "px";
    }
    calcHeight();
}
export function stopBubble(e) {
    e.stopImmediatePropagation();
}
export function clearMenu() {
    while (gui.childElementCount > 1) {
        gui.removeChild(gui.lastChild);
    }
}
export function newElement(elem, id, genstyle, text = "") {
    const element = docum.createElement(elem);
    element.setAttribute("id", id);
    setStyle(element, genstyle);
    if (text.length !== 0) {
        addTextElement(element, text);
    }
    return element;
}
export function modElementText(elem, text) {
    const element = docum.getElementById(elem);
    if (element !== null) {
        element.textContent = text;
    }
}
export function appendElement(elem1, elem2) {
    const element = docum.getElementById(elem1);
    if (element !== null) {
        element.appendChild(elem2);
        verifyHeight();
    }
}
export function addTextElement(elem, text) {
    const elementText = docum.createTextNode(text);
    elem.appendChild(elementText);
}
export function addNewLine(elem) {
    const br = docum.createElement("br");
    elem.appendChild(br);
}
export function closeGUI(e, ns) {
    docum.getElementById("entire-game-container").removeChild(docum.getElementById("extraGUI"));
    ns.exit();
}
export function setPos(x, y) {
    setStyle(gui, { top: x + "px", left: y + "px" });
}
function dragElement() {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0, pmax = parseInt(gui.parentNode.offsetWidth, 10) - parseInt(gui.style.width, 10);
    if (docum.getElementById(gui.id + "header")) {
        docum.getElementById(gui.id + "header").onmousedown = dragMouseDown;
    }
    else {
        gui.onmousedown = dragMouseDown;
    }
    function dragMouseDown(e) {
        e = e || wind.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        docum.onmouseup = closeDragElement;
        docum.onmousemove = elementDrag;
    }
    function elementDrag(e) {
        e = e || wind.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        if (pmax < gui.offsetLeft - pos1) {
            pos1 = gui.offsetLeft - pmax;
        }
        else if (0 > gui.offsetLeft - pos1) {
            pos1 = gui.offsetLeft;
        }
        if (pcalcmay < gui.offsetTop - pos2) {
            pos2 = gui.offsetTop - pcalcmay;
        }
        else if (0 > gui.offsetTop - pos2) {
            pos2 = gui.offsetTop;
        }
        gui.style.top = (gui.offsetTop - pos2) + "px";
        gui.style.left = (gui.offsetLeft - pos1) + "px";
    }
    function closeDragElement() {
        docum.onmouseup = null;
        docum.onmousemove = null;
    }
}
export function setStyle(elem, style) {
    for (const name in style) {
        if (style.hasOwnProperty(name)) {
            elem.style[name] = style[name];
        }
    }
}
export function mergeStyles(style1, style2, style3) {
    const styles1 = [];
    const styles2 = [];
    const styles3 = [];
    for (const name in style1) {
        if (style1.hasOwnProperty(name)) {
            styles1.push(name);
        }
    }
    for (const name in style2) {
        if (style2.hasOwnProperty(name)) {
            styles2.push(name);
        }
    }
    if (style3 != null) {
        for (const name in style3) {
            if (style3.hasOwnProperty(name)) {
                styles3.push(name);
            }
        }
    }
    for (let i = 0; i < styles1.length; i++) {
        if (styles2.includes(styles1[i])) {
            styles1.splice(i, 1);
            i--;
        }
        if (style3 != null) {
            if (styles3.includes(styles1[i])) {
                styles1.splice(i, 1);
                i--;
            }
        }
    }
    const mergedstyle = {};
    for (const name of styles1) {
        mergedstyle[name] = style1[name];
    }
    for (const name of styles2) {
        mergedstyle[name] = style2[name];
    }
    if (style3 != null) {
        for (const name of styles3) {
            mergedstyle[name] = style3[name];
        }
    }
    return mergedstyle;
}
export function SetMaxRows(num) {
    maxRows = num;
}
export function SetGenericStyle(style) {
    genericStyle = style;
}
export function SetHeaderStyle(style) {
    headerStyle = style;
}
export function SetOptionsStyle(style) {
    optionsStyle = style;
}
export function CreateContainer(str, num, doc) {
    const obj = { str, num, doc, CurrentElementId, CurrentElement, PrevElement, NextElement };
    return obj;
}
function CurrentElementId() {
    return this.str + this.num;
}
function CurrentElement() {
    return this.doc.getElementById(this.str + this.num);
}
function NextElement() {
    this.num++;
}
function PrevElement() {
    this.num--;
}
//# sourceMappingURL=GUIFramework.js.map
