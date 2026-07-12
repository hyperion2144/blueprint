// Proposal grammar — PR deliverables with refs to FR/D

Proposal
  = "# Proposal:" __ name:LineRest NEWLINE
    __ intent:IntentSection
    __ refs:RefsSection?
    __ extRefs:ExtRefsSection?
    __ deliverables:DeliverablesSection __ (.)*
    { return { name, intent, refs, extRefs: extRefs || [], deliverables: deliverables || [] }; }

ExtRefsSection
  = "## External References" NEWLINE lines:(_ !"- " !"## " !NEWLINE text:LineRest NEWLINE)*
    { return lines.filter(l => l.text).map(l => l.text); }
IntentSection
  = "## Intent" NEWLINE text:ContentBlock

RefsSection
  = "## References" NEWLINE refs:RefLine+
    { return refs; }

RefLine
  = __ "- " refId:RefId ": " text:LineRest NEWLINE
    { return { ref: refId, text }; }

RefId
  = "FR-" id:Integer { return "FR-" + id; }
  / "NFR-" id:Integer { return "NFR-" + id; }
  / "D-" id:Integer { return "D-" + id; }

DeliverablesSection
  = "## Deliverables" NEWLINE items:DeliverableItem*
    { return items; }

DeliverableItem
  = __ "- PR-" id:Integer ": " title:DeliverableTitle restLine:RefsOnLine? NEWLINE desc:DescriptionBlock?
    { return { id, title, refs: restLine?.refs || [], description: desc || "" }; }

DeliverableTitle
  = chars:(!"refs:" [^\n\r])* { return chars.map(c => c[1]).join("").trim(); }

RefsOnLine
  = "refs:" __ refs:RefIdList
    { return { refs }; }

RefIdList
  = head:RefId tail:(__ "," __ RefId)*
    { return [head].concat(tail.map(t => t[3])); }

DescriptionBlock
  = lines:(_ !"- " !"## " !NEWLINE text:LineRest NEWLINE { return text; })+
    { return lines.join(" ").trim(); }

ContentBlock
  = lines:(_ !"## " !NEWLINE text:LineRest NEWLINE { return text; })+
    { return lines.join("\n"); }


Integer
  = digits:[0-9]+ { return parseInt(digits.join("")); }

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

_ = [ 	]*
__
  = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
