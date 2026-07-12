// Research summary grammar
// Parses # Summary: with ## Recommendation and ## Rationale

ResearchSummary
  = "# Summary:" __ name:LineRest NEWLINE
    Gap rec:RecommendationSection
    Gap rat:RationaleSection
    __ (.)*
    { return { name, recommendation: rec, rationale: rat }; }

RecommendationSection
  = "## Recommendation" NEWLINE text:ContentBlock
    { return text; }

RationaleSection
  = "## Rationale" NEWLINE text:ContentBlock
    { return text; }

ContentBlock
  = lines:(_ !"## " !NEWLINE text:LineRest NEWLINE { return text; })+
    { return lines.join("\n"); }

Gap = ( !"##" LineRest NEWLINE / NEWLINE )*

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

_ = [ \t]*
__ = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
