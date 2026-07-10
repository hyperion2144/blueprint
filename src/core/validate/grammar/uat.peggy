// UAT grammar — test cases with steps, verdicts

UAT
  = "# UAT:" __ name:LineRest NEWLINE
    __ statusLine:StatusLine
    __ tests:(TestSection / BlankLine / OtherLine)*
    { return { name, tests: tests.filter(t => t && t.id !== undefined) }; }

StatusLine
  = "Status: " status:UatStatus NEWLINE
    { return status; }

UatStatus
  = "TESTING" / "PASSED" / "HAS_GAPS"

TestSection
  = "## UT-" id:Integer ": " title:LineRest NEWLINE
    __ "- Steps: " steps:LineRest NEWLINE
    __ "- Expected: " expected:LineRest NEWLINE
    __ ("- Actual: " actual:LineRest NEWLINE)?
    __ "- Verdict: " verdict:VerdictType NEWLINE
    { return { id, title, steps, expected, verdict }; }

VerdictType
  = "PASS" / "FAIL" / "SKIP"

BlankLine
  = NEWLINE

OtherLine
  = __ text:LineRest NEWLINE

Integer
  = digits:[0-9]+ { return parseInt(digits.join("")); }

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

_ = [ 	]*
__
  = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
