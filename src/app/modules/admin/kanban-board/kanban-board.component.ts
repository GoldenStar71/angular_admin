import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';
import { groupBy } from 'lodash';
import { KanbanBoardService } from './kanban-board.service';

@Component({
  selector: 'app-kanban-board',
  templateUrl: './kanban-board.component.html',
  styleUrls: ['./kanban-board.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class KanbanBoardComponent implements OnInit, OnDestroy {

  lists: Record<string, any[]>;
  objectKeys = Object.keys;

  private _data: any[];
  private _groupBy: string;
  private readonly _positionStep: number = 65536;
  private readonly _maxListCount: number = 200;
  private readonly _maxPosition: number = this._positionStep * 500;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  constructor(
    private _kanbanService: KanbanBoardService,
  ) { }

  ngOnInit(): void {

    // Get the tasks
    this._kanbanService.data$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((response: any[]) => {
        console.log(response);
        this._data = response;
        this._groupBy = this._kanbanService.groupBy;
        this.generateBoard(this._data);
      });
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  /**
   * Generate kanban list
   *
   * @param tasks GroupBy param from url
   */
  generateBoard(tasks: any[]): void {
    this.lists = groupBy(tasks, this._groupBy);
  }

  // onSearchTask(searchForm: FormGroup): void {
  //   this._kanbanService.getData(searchForm).subscribe();
  // }

  /**
   * Card dropped
   *
   * @param event
   */
  cardDropped(event: CdkDragDrop<any[]>): void {
    // Move or transfer the item
    if (event.previousContainer === event.container) {
      // Move the item
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Transfer the item
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);

      // Update the card's list it
      event.container.data[event.currentIndex].listId = event.container.id;
    }

    // Calculate the positions
    const updated = this._calculatePositions(event);

    // Update the cards
    // this._kanbanService.updateCards(updated).subscribe();
  }

  /**
   * Track by function for ngFor loops
   *
   * @param index
   * @param item
   */
  trackByFn(index: number, item: any): any {
    return item.AppDataId || index;
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Calculate and set item positions
   * from given CdkDragDrop event
   *
   * @param event
   * @private
   */
  private _calculatePositions(event: CdkDragDrop<any[]>): any[] {
    // Get the items
    let items = event.container.data;
    const currentItem = items[event.currentIndex];
    const prevItem = items[event.currentIndex - 1] || null;
    const nextItem = items[event.currentIndex + 1] || null;

    // If the item moved to the top...
    if (!prevItem) {
      // If the item moved to an empty container
      if (!nextItem) {
        currentItem.position = this._positionStep;
      }
      else {
        currentItem.position = nextItem.position / 2;
      }
    }
    // If the item moved to the bottom...
    else if (!nextItem) {
      currentItem.position = prevItem.position + this._positionStep;
    }
    // If the item moved in between other items...
    else {
      currentItem.position = (prevItem.position + nextItem.position) / 2;
    }

    // Check if all item positions need to be updated
    if (!Number.isInteger(currentItem.position) || currentItem.position >= this._maxPosition) {
      // Re-calculate all orders
      items = items.map((value, index) => {
        value.position = (index + 1) * this._positionStep;
        return value;
      });

      // Return items
      return items;
    }

    // Return currentItem
    return [currentItem];
  }
}
