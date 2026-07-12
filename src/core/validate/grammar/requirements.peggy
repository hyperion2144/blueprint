// Requirements grammar
// Parses FR/NFR sections with status, GIVEN/WHEN/THEN, and constraints

Requirements
  = "# Requirements:" __ name:LineRest body:(Section / BlankLine)*
    { return { name, sections: body.filter(b => b && b.prefix) }; }

BlankLine
  = NEWLINE

Section
  = heading:(SectionHeading) NEWLINE
    blocks:(GivenWhenThenBlock / ConstraintLine / PlainLine / BlankLine)*
    { return { prefix: heading.prefix, id: heading.id, title: heading.title, status: heading.status, blocks: blocks.filter(b => b !== null) }; }
SectionHeading
  = "## " prefix:("FR-" / "NFR-") id:Integer __ ": " t:LineRest
    { 
      const statusMatch = t.match(/\[(CURRENT|COMPLETED|PENDING)\]$/);
      return { prefix, id, title: statusMatch ? t.slice(0, statusMatch.index).trim() : t, status: statusMatch ? statusMatch[1] : null };
    }
  / "## " prefix:("FR-" / "NFR-") text:$[^ :\n\r]+ { error('"' + prefix + text + '": ID must be numeric (e.g. "' + prefix + '1")'); }

Status
  = "CURRENT" / "COMPLETED" / "PENDING"

GivenWhenThenBlock
  = given:GivenLine when:WhenLine then:ThenLine
    { return { type: "gwt", given, when, then }; }

GivenLine
  = __ "**GIVEN**" givenText:LineRest NEWLINE

WhenLine
  = __ "**WHEN**" whenText:LineRest NEWLINE

ThenLine
  = __ "**THEN**" thenText:LineRest NEWLINE

ConstraintLine
  = __ "- " constraintText:LineRest NEWLINE
    { return { type: "constraint", text: constraintText }; }

PlainLine
  = _ !"#" text:LineRest NEWLINE
    { return { type: "text", text }; }

Integer
  = digits:[0-9]+ { return parseInt(digits.join("")); }

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

_ = [ 	]*
__
  = [ \t]*

NEWLINE
  = "\n" / "\r\n" / "\r"
