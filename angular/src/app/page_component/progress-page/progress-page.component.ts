import { Component, inject, signal } from "@angular/core";
import { ProgressCardComponent } from "../../component/progress-card/progress-card.component";
import { DataProcessingService } from "../../service/data-processing.service";
import type { PeriodGranularity, ProgressCardOutput, StateInfoData, StatusInfo, TimePeriod } from "../../model/format.type";



@Component({
  selector: "app-progress-page",
  imports: [ProgressCardComponent],
  templateUrl: "./progress-page.component.html",
  styleUrl: "./progress-page.component.css",
})
export class ProgressPageComponent {
  data_service = inject(DataProcessingService);
  progress_info = signal<Array<StatusInfo>>([]);
  state_data = signal<Array<StateInfoData>>([]);
  available_period = signal<Map<PeriodGranularity, Array<TimePeriod>>>(
    new Map<PeriodGranularity, Array<TimePeriod>>([
      ["YEAR", []],
      ["QUARTER", []],
      ["MONTH", []],
      ["WEEK", []]
    ])
  )
  // available_period_year = signal<Array<TimePeriod>>([]);
  // available_period_quarter = signal<Array<TimePeriod>>([]);
  // available_period_month = signal<Array<TimePeriod>>([]);
  // available_period_week = signal<Array<TimePeriod>>([]);
  current_period !: TimePeriod;
  isShrunk = false;
  period_type: Array<PeriodGranularity> = ["YEAR", "QUARTER", "MONTH", "WEEK"];


  clickShrink() {
    this.isShrunk = !this.isShrunk;
  }

  ngOnInit() {
    this.getNewPeriodDataList("WEEK")
  }

  clickPeriodType(type: PeriodGranularity) {
    const current = this.available_period().get(type);
    if (current?.length === 0) {
      this.getNewPeriodDataList(type)
    } else if (current && current.length > 0) {
      const temp_period = current[current.length - 1]
      if (this.current_period.start_date === temp_period.start_date && this.current_period.end_date === temp_period.end_date) {
        console.log("same")
        return
      }
      this.current_period = current[current.length - 1];
      this.getNewStateCount(this.current_period.start_date, this.current_period.end_date);
    }
  }

  getNewPeriodDataList(type: PeriodGranularity) {
    this.data_service.getAvailablePeriods(type).subscribe((periods) => {
      if (periods.length !== 0) {
        this.available_period().set(type, periods)

        this.current_period = periods[periods.length - 1]
        this.getNewStateCount(this.current_period.start_date, this.current_period.end_date)
      }
    });
  }

  getNewStateCount(start_date: Date, end_date: Date) {
    console.log(`start: ${start_date}, end: ${end_date}`)
    this.data_service.getStateCount(start_date.toISOString(), end_date.toISOString()).subscribe((result) => {
      this.progress_info.set(result);
    });
  }

  showDataOfState(input: ProgressCardOutput) {
    input.state_id
  }
}
