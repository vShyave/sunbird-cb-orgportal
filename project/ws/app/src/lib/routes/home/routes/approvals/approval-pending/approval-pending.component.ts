import { Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { MatDialog, MatSnackBar, PageEvent } from '@angular/material'
import { EventService } from '@sunbird-cb/utils'

/* tslint:disable */
import _ from 'lodash'
/* tslint:enable */
import { TelemetryEvents } from '../../../../../head/_services/telemetry.event.model'
import { ReportsVideoComponent } from '../../reports-video/reports-video.component'
import { ApprovalsService } from '../../../services/approvals.service'

@Component({
  selector: 'ws-approval-pending',
  templateUrl: './approval-pending.component.html',
  styleUrls: ['./approval-pending.component.scss'],
})

export class ApprovalPendingComponent implements OnInit, OnDestroy {
  data: any = []
  approvalData: any = []
  currentFilter = 'profileverification'
  discussionList!: any
  discussProfileData!: any
  departName = ''
  approvalTotalCount = 0
  limit = 20
  pageIndex = 0
  currentOffset = 0
  configSvc: any
  reportsNoteList: string[] = []
  showApproveALL = false
  disableApproveALL = false

  constructor(
    private router: Router,
    private apprService: ApprovalsService,
    private activeRouter: ActivatedRoute,
    private route: ActivatedRoute,
    private events: EventService,
    public dialog: MatDialog,
    private sanitizer: DomSanitizer,
    private snackbar: MatSnackBar) {
    this.configSvc = this.route.parent && this.route.parent.snapshot.data.configService
    if (this.activeRouter.parent && this.activeRouter.parent.snapshot.data.configService.unMappedUser.channel
    ) {
      this.departName = _.get(this.activeRouter, 'parent.snapshot.data.configService.unMappedUser.channel')
    }
  }

  ngOnInit() {
    this.currentFilter = this.route.snapshot.params['tab'] || 'profileverification'
    // this.currentFilter = this.currentFilter === 'upload' ? 'uploadApprovals' : 'pending'
    if (this.currentFilter === 'profileverification') {
      this.fetchApprovals()
    }
    if (this.currentFilter !== 'profileverification') {
      this.fetchApprovals()
    }

    this.reportsNoteList = [
      // tslint:disable-next-line: max-line-length
      `Profile Verifications: Review and approve/reject user requests for verification of one or more primary fields.`,
      // tslint:disable-next-line: max-line-length
      `Transfers: Manage user transfer requests, including approving/rejecting transfers. You will receive these request in the “Transfers” section.`,
      // tslint:disable-next-line: max-line-length
      `You can update multiple user profiles in one go by using Bulk Profile Update.`,
    ]
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html)
  }

  openVideoPopup() {
    this.dialog.open(ReportsVideoComponent, {
      data: {
        videoLink: 'https://www.youtube.com/embed/tgbNymZ7vqY?autoplay=1&mute=1',
      },
      disableClose: true,
      width: '50%',
      height: '60%',
      panelClass: 'overflow-visable',
    })
  }

  filter(key: string | 'timestamp' | 'best' | 'saved') {
    if (key) {
      this.currentFilter = key
      if (key === 'profileverification') {
        this.fetchApprovals()
      }
      if (key === 'transfers') {
        this.fetchApprovals()
      }
    }
  }

  public tabTelemetry(label: string, index: number) {
    const data: TelemetryEvents.ITelemetryTabData = {
      label,
      index,
    }
    this.events.handleTabTelemetry(
      TelemetryEvents.EnumInteractSubTypes.APPROVAL_TAB,
      data,
    )
  }

  onApprovalClick(approval: any) {
    if (approval && approval.userWorkflow.userInfo) {
      this.router.navigate([`/app/approvals/${approval.userWorkflow.userInfo.wid}/to-approve`])
    }
    // this.telemetrySvc.impression()
    this.events.raiseInteractTelemetry(
      {
        type: TelemetryEvents.EnumInteractTypes.CLICK,
        subType: TelemetryEvents.EnumInteractSubTypes.CARD_CONTENT,
        id: TelemetryEvents.EnumIdtype.APPROVAL_ROW,
      },
      {
        id: approval.userWorkflow.userInfo.wid,
        type: TelemetryEvents.EnumIdtype.WORK_ORDER,
      }
    )

  }

  fetchApprovals() {
    if (this.departName) {
      const req = {
        serviceName: 'profile',
        applicationStatus: 'SEND_FOR_APPROVAL',
        deptName: this.departName,
        offset: this.currentOffset,
        limit: this.limit,
      }
      this.apprService.getApprovals(req).subscribe(res => {
        this.data = []
        const newarray: any = []
        let currentdate: Date
        const resData = res.result.data
        resData.forEach((approval: any) => {
          // let keys = ''
          approval.wfInfo.forEach((wf: any) => {
            currentdate = new Date(wf.createdOn)
            if (typeof wf.updateFieldValues === 'string') {
              const fields = JSON.parse(wf.updateFieldValues)
              if (fields.length > 0) {
                fields.forEach((field: any) => {
                  // if (Object.keys(field.fromValue).length > 0) {
                  //   keys += `${_.first(Object.keys(field.fromValue))}, `
                  // } else {
                  //   keys += `${_.first(Object.keys(field.toValue))}, `
                  // }
                  const labelKey = Object.keys(field.toValue)[0]
                  if (labelKey === 'designation' || labelKey === 'group') {
                    if (newarray.find((u: any) => u.userInfo.wid === approval.userInfo.wid) === undefined) {
                      newarray.push(approval)
                    }
                  }
                })
              }
            }
          })
        })

        newarray.forEach((appr: any) => {
          this.data.push({
            fullname: appr.userInfo ? `${appr.userInfo.first_name}` : '--',
            requestedon: currentdate,
            // fields: this.replaceWords(keys, conditions),
            userWorkflow: appr,
            tag: (appr.userInfo && appr.userInfo.tag) ? `${appr.userInfo.tag}` : '',
          })
          this.data.sort((a: any, b: any) => {
            const textA = a.fullname.toUpperCase()
            const textB = b.fullname.toUpperCase()
            return (textA < textB) ? -1 : (textA > textB) ? 1 : 0
          })
        })
        this.approvalTotalCount = this.data.length
        this.approvalData = this.data
        if (this.data && this.data.length > 0) {
          this.showApproveALL = true
          this.disableApproveALL = false
        }
      })
    } else {
      this.snackbar.open('Please connect to your SPV admin, to update MDO name.')
    }
  }

  // get getTableData() {
  //   if (this.data.length > 0) {
  //     this.data.forEach((element: any) => {
  //       // element.requestedon = this.datePipe.transform(element.requestedon, 'dd MMM y')
  //       element.requestedon = element.requestedon
  //     })
  //   }
  //   return this.data
  // }

  replaceWords(inputString: any, wordConditions: any) {
    return wordConditions.reduce((acc: any, [word, condition]: any) => {
      return acc.replace(new RegExp(word, 'gi'), condition)
    },                           inputString)
  }

  onSearch(enterValue: any) {
    // this.data.filter((user: any) => enterValue.includes(user.userInfo.first_name))
    const filterValue = enterValue.toLowerCase()
    this.data = this.approvalData.filter((user: any) => user.fullname.toLowerCase().includes(filterValue))
  }

  onPaginateChange(event: PageEvent) {
    this.pageIndex = event.pageIndex
    this.limit = event.pageSize
    this.currentOffset = event.pageIndex
    this.fetchApprovals()
  }

  ngOnDestroy(): void { }

  onApproveAllReqs(req: any) {
    this.apprService.handleWorkflow(req).subscribe((res: any) => {
      if (res.result.data) {
      }
    })
  }
  onApproveALL() {
    this.disableApproveALL = true
    if (this.data && this.data.length > 0) {
      const datalength = this.data.length
      this.data.forEach((data: any, index: any) => {
        if (data.userWorkflow.wfInfo && data.userWorkflow.wfInfo.length > 0) {
          const action = 'APPROVE'
          data.userWorkflow.wfInfo.forEach((wf: any) => {
            const req: any = {
              action,
              state: 'SEND_FOR_APPROVAL',
              userId: wf.userId,
              actorUserId: data.userWorkflow.userInfo.wid,
              serviceName: 'profile',
            }
            const listupdateFieldValues = JSON.parse(wf.updateFieldValues)
            req['applicationId'] = wf.applicationId
            req['wfId'] = wf.wfId
            req['updateFieldValues'] = listupdateFieldValues
            this.onApproveAllReqs(req)

            this.events.raiseInteractTelemetry(
              {
                type: TelemetryEvents.EnumInteractTypes.CLICK,
                subType: TelemetryEvents.EnumInteractSubTypes.BTN_CONTENT,
              },
              {
                id: wf.applicationId,
                type: TelemetryEvents.EnumIdtype.APPLICATION,
              }
            )
          })
        }

        if (index === datalength - 1) {
          setTimeout(() => {
            this.openSnackbar('All requests are Approved')
            this.fetchApprovals()
            /* tslint:disable */
          }, 200)
        }
      })
    }
  }

  private openSnackbar(primaryMsg: string, duration: number = 5000) {
    this.snackbar.open(primaryMsg, 'X', {
      duration,
    })
  }

  showButton() {
    this.disableApproveALL = true
  }
}
