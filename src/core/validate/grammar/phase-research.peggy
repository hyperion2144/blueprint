// Phase research grammar
// Parses # Research: with ## Research Scope, ## Recommendation, optional ## Risks

PhaseResearch
  = "# Research:" __ name:LineRest NEWLINE
    __ scope:ScopeSection
    __ rec:RecommendationSection
    __ risks:RisksSection?
    __ (.)*
    { return { name, scope, recommendation: rec, risks: risks || [] }; }

ScopeSection
  = "## Research Scope" NEWLINE text:ContentBlock
    { return text; }

RecommendationSection
  = "## Recommendation" NEWLINE text:ContentBlock
    { return text; }

RisksSection
  = "## Risks" NEWLINE items:RiskItem+
    { return items; }

RiskItem
  = __ "- " text:LineRest NEWLINE
    { return text; }

ContentBlock
  = lines:(_ !"## " !NEWLINE text:LineRest NEWLINE { return text; })+
    { return lines.join("\n"); }

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

_ = [ \t]*
__ = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
