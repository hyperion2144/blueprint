// Design grammar — DS items with refs to PR

Design
  = "# Design:" __ name:LineRest NEWLINE
    __ items:DesignItemsSection __ (.)* { return { name, items: items || [] }; }

DesignItemsSection
  = "## Design Items" NEWLINE items:DesignItem+
    { return items; }

DesignItem
  = __ "- DS-" id:Integer ": " title:LineRest NEWLINE
    refsLine:RefsLine
    desc:DescriptionBlock?
    { return { id, title, refs: refsLine, description: desc }; }

RefsLine
  = __ "refs: " refs:PRList NEWLINE
    { return refs; }

PRList
  = head:PRId tail:(__ "," __ PRId)*
    { return [head].concat(tail.map(t => t[3])); }

PRId
  = "PR-" id:Integer { return "PR-" + id; }

DescriptionBlock
  = lines:(_ !"- " !"## " !NEWLINE text:LineRest NEWLINE)+
    { return lines.map(l => l.text).join("\n").trim(); }

Integer
  = digits:[0-9]+ { return parseInt(digits.join("")); }

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

_ = [	]*
__
  = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
