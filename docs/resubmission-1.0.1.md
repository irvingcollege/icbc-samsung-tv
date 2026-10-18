# ICBC 1.0.1 documentation resubmission

Samsung's rejection requests missing **app preview images** in the Application UI Description and a new application version. The completed document uses the supplied Samsung v1.4.2 template, retains its main sections, removes its instruction/unused diagram-example slides as the template directs, and fills all retained sections with ICBC content. Its four preview images are genuine browser app renders, not fabricated TV/video screenshots. Playback-error and non-physical-TV limitations are disclosed.

Download from the repository's `downloads/` directory:

- `ICBC-TV-Application-UI-Description-v1.0.1.pptx`: submit this in the Application UI Description attachment field (normally Verification Info), replacing the rejected description.
- `ICBC-TV-Application-UI-Description-v1.0.1.pdf`: view/print reference; use the PPTX when the portal requests the template file.
- `ICBC-TV-release-source-1.0.1.zip`: clean production-only source folder; this is **not** the uploadable signed widget.

## User steps

1. Review the filled document, especially church information and reviewer instructions.
2. Extract the clean source ZIP. In VS Code, open the extracted `ICBC-TV-release-1.0.1` folder, select the **same ICBC-TV author/distributor profile**, and Build Project. Version 1.0.1 and the screen-size feature are already set; no manual code edit is needed.
3. Upload the newly signed `.wgt` from its `Debug` folder as app version **1.0.1**. Do not upload the source ZIP or any signing keys. A signed 1.0.1 widget has not been produced in this cloud because the private profile stays on the user's machine.
4. Replace the Application UI Description attachment with the completed PPTX, save, and request the new release using 1.0.1. The existing rejected 1.0.0 history entry is not the new submission.
5. Suggested release note: "Updated application description with actual app preview images and complete navigation and remote-control documentation. No functional changes."

Samsung may identify additional issues; the filled document does not establish store acceptance, physical-TV compatibility or successful production streaming.

## Regeneration

`python3 scripts/prepare-ui-description.py /path/to/app_description_template_eng_v142_edited3.pptx` uses python-pptx and genuine captures in `artifacts/seller-office-assets/` (`01-home.jpg`, `02-sermons.jpg`, `03-exit-confirmation.jpg`, `04-player-browser.jpg`). The final PPTX embeds those images. The original uploaded template is not republished separately. PDF was rendered with LibreOffice and key page layouts inspected. Do not substitute invented video frames or fabricated media for missing captures.
