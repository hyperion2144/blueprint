// Design grammar — DS items with refs to PR

Design
  = "# Design:" __ name:LineRest NEWLINE
    Gap items:DesignItemsSection __ (.)* { return { name, items: items || [] }; }

DesignItemsSection
  = "## Design Items" NEWLINE items:DesignItem*
    { return items; }

DesignItem
  = __ "- DS-" id:Integer ": " title:LineRest NEWLINE
    refsLine:RefsLine
    desc:DescriptionBlock?
    { return { id, title, refs: refsLine, description: desc }; }

RefsLine
  = __ "refs: " refs:PRList NEWLINE
    { return refs; }
  / __ text:LineRest NEWLINE
    { error('Expected "refs: PR-N" on its own indented line after the DS title (found: "' + text + '")'); }

PRList
  = head:PRId tail:(__ "," __ PRId)*
    { return [head].concat(tail.map(t => t[3])); }

PRId
  = "PR-" id:Integer { return "PR-" + id; }
  / "PR" digits:$[0-9]+ { error('"PR' + digits + '": missing dash — use "PR-' + digits + '"'); }
  / text:$[^,: \t\n\r]+ { error('"' + text + '": ref must start with PR-'); }

DescriptionBlock
  = lines:(_ !"- " !"## " text:LineRest NEWLINE { return text; } / NEWLINE { return ""; })+
    { return lines.join("\n").trim(); }


Gap = ( !"##" LineRest NEWLINE / NEWLINE )*
Integer
  = digits:[0-9]+ { return parseInt(digits.join("")); }

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }
_ = [ \t]*
__
  = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
