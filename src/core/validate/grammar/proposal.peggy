// Proposal grammar — PR deliverables with refs to FR/D

Proposal
  = "# Proposal:" __ name:LineRest NEWLINE
    Gap intent:IntentSection
    Gap refs:RefsSection?
    Gap extRefs:ExtRefsSection?
    Gap deliverables:DeliverablesSection __ (.)*
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
  / "D" digits:$[0-9]+ { error('"D' + digits + '": missing dash — use "D-' + digits + '"'); }
  / text:$[^,: \t\n\r]+ { error('"' + text + '": ref must start with FR-/NFR-/D-'); }

DeliverablesSection
  = "## Deliverables" NEWLINE items:DeliverableItem*
    { return items; }

DeliverableItem
  = __ "- PR-" id:Integer ": " title:LineRest NEWLINE
    refsLine:RefsLine
    desc:DescriptionBlock?
    { return { id, title, refs: refsLine, description: desc || "" }; }
  / __ "- PR-" text:$[^ :\n\r]+ { error('"PR-' + text + '": ID must be numeric (e.g. "PR-1")'); }

RefsLine
  = __ "refs: " refs:RefIdList NEWLINE
    { return refs; }
  / __ text:LineRest NEWLINE
    { error('Expected "refs: FR-N, D-N" on its own indented line after the PR title (found: "' + text + '")'); }

RefIdList
  = head:RefId tail:(__ "," __ RefId)*
    { return [head].concat(tail.map(t => t[3])); }

DescriptionBlock
  = lines:(_ !"- " !"## " text:LineRest NEWLINE { return text; } / NEWLINE { return ""; })+
    { return lines.join(" ").trim(); }

ContentBlock
  = lines:(_ !"## " text:LineRest NEWLINE { return text; } / NEWLINE { return ""; })+
    { return lines.join("\n"); }


Gap = ( !"##" LineRest NEWLINE / NEWLINE )*

Integer
  = digits:[0-9]+ { return parseInt(digits.join("")); }

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

_ = [ 	]*
__
  = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
