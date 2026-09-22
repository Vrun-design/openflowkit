%% ofk 1
flowchart down

Start [ellipse] -> Validate
Validate -> Ok? [diamond]
Ok? -> Ship : yes
Ok? -> Fix : no
Fix -> Validate
Ship -> End [ellipse]

animate build 12s {
  step Start
  step Validate
  step Validate -> Ok? : "checks the payload"
  step Ok?, Ship, Fix
  step Ship -> End hold 3s
}
