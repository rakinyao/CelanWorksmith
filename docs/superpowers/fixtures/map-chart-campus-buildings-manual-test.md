# Map Chart campus upload: manual verification

Fixture: `map-chart-campus-buildings.geojson` (one campus outline and three building footprints).

Prerequisite: frontend and backend must include the application-map-resource changes. An older backend returns an error on upload even if the editor already displays the new menu.

1. In the application editor, open App Settings > Map resources (应用设置 > 地图资源). Enter `示例园区`, choose `map-chart-campus-buildings.geojson`, and click Upload map (上传地图). Expect a new resource named `示例园区` with 4 regions. Uploading the same file again creates a separate resource; it does not replace the first ID.
2. Add a Map Chart widget. In its Map Type control select the application map `示例园区`. Set Chart Data to:

   ```js
   {{[
     { id: "campus-001", value: 5 },
     { id: "building-a", value: 12 },
     { id: "building-b", value: 24 },
     { id: "building-c", value: 36 }
   ]}}
   ```

   Expect an outer campus boundary and three internal building boundaries, with their respective labels/values. This is one flat map, not an automatic drilldown. The outer campus polygon overlaps the buildings; confirm the inner outlines remain visible and clickable at your chart size.
3. Add a SelectBox and bind its Options to `{{MapChart1.regionOptions}}` (replace `MapChart1` with the widget's actual name). Expect four choices: 示例园区, 研发楼 A, 运营楼 B, 实验楼 C. Their values are respectively `campus-001`, `building-a`, `building-b`, `building-c`.
4. Click a building. Expect `MapChart1.selectedDataPoint.originalId` to equal that building's exact ID and its label to equal the corresponding building name. Choosing a region in SelectBox does not automatically zoom or drill down.
5. Publish the application and open its view URL. Expect the same selected map resource and chart data. Uploading another file alone must not change the published map. In the editor select the new resource ID and publish again to change the view.

If map load fails, keep the saved resource selected and report the error; do not fall back to an unrelated built-in map. Uploaded boundary accuracy and visual hierarchy are the author's responsibility.
