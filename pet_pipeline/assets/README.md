# Asset Inputs

This folder stores local source material that the pipeline consumes.

## Character directories

- `characters/<character>/master/`: best approved full-body source images
- `characters/<character>/reference/`: identity lock references for IP-Adapter
- `characters/<character>/masks/`: face/eyes/mouth masks for inpaint
- `characters/<character>/control/`: ControlNet guides such as pose or silhouette maps

## Training directories

- `training/<character>/raw/`: untouched training inputs
- `training/<character>/processed/`: cleaned and cropped training set
- `training/<character>/captions/`: one caption file per processed image

All directories are intentionally empty until you place local source files there.

