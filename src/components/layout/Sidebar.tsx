import React from "react";

// Logo IFC (3 triangles, sans texte) — base64 embarqué
const LOGO_IFC_B64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjU2IiB6b29tQW5kUGFuPSJtYWduaWZ5IiB2aWV3Qm94PSIwIDAgMTkyIDE5MS45OTk5OTYiIGhlaWdodD0iMjU2IiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCBtZWV0IiB2ZXJzaW9uPSIxLjAiPjxkZWZzPjxmaWx0ZXIgeD0iMCUiIHk9IjAlIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBpZD0iMWUyZGNjOGEzYyI+PGZlQ29sb3JNYXRyaXggdmFsdWVzPSIwIDAgMCAwIDEgMCAwIDAgMCAxIDAgMCAwIDAgMSAwIDAgMCAxIDAiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiIvPjwvZmlsdGVyPjxmaWx0ZXIgeD0iMCUiIHk9IjAlIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBpZD0iZTU1YmI2Zjg3ZSI+PGZlQ29sb3JNYXRyaXggdmFsdWVzPSIwIDAgMCAwIDEgMCAwIDAgMCAxIDAgMCAwIDAgMSAwLjIxMjYgMC43MTUyIDAuMDcyMiAwIDAiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiIvPjwvZmlsdGVyPjxjbGlwUGF0aCBpZD0iMGJlZjJmYTdkOSI+PHBhdGggZD0iTSAyMS4zMTY0MDYgMS4zMDg1OTQgTCAxOTIgMS4zMDg1OTQgTCAxOTIgMTkxLjgwODU5NCBMIDIxLjMxNjQwNiAxOTEuODA4NTk0IFogTSAyMS4zMTY0MDYgMS4zMDg1OTQgIiBjbGlwLXJ1bGU9Im5vbnplcm8iLz48L2NsaXBQYXRoPjxtYXNrIGlkPSJlMWQyODM1ZDhiIj48ZyBmaWx0ZXI9InVybCgjMWUyZGNjOGEzYykiPjxnIGZpbHRlcj0idXJsKCNlNTViYjZmODdlKSIgdHJhbnNmb3JtPSJtYXRyaXgoMS4yODg4ODksIDAsIDAsIDEuMjg3MTYyLCAyMS4zMTc5NTYsIDEuMzA5NDY5KSI+PGltYWdlIHg9IjAiIHk9IjAiIHdpZHRoPSIyNzAiIHhsaW5rOmhyZWY9ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBUTRBQUFDVUNBQUFBQUJIVUpqb0FBQUFBbUpMUjBRQS80ZVB6TDhBQUFxRlNVUkJWSGljN1p4cmpDUlZGY2ZQcldkM3o2T25wNmZaR1hhVzNZVUIyUldFaFFGRTJSQmNRQ0hyZ3JLUjVTMGhra0NNY1FHTkpnb2FZb3dmREVZVG8vR0xNVEV4NmdlanJ1ZzNUU1RHRUNTcytGZ0ZCRllXM01mMFRIZFYzZmU5ZnVqWjJYbDNWVTExOTYybGY1KzZhcXJ1UGZYdmM4ODk5OVR0QWVqVHAwK2ZQbjM2OU9uVHAwK2ZQbjM2OU9uVHA4KzdFcnNUalk1OXRmcHlKOXJOSjliWFF2d0oxR3NyakdIcUphMS9OOVpySzR6aFlhMTFmVyt2clRDRmMzNmp0ZGFIeXIyMnd4RDJZSzIxRHUvdHRSMXBzREpzQzFtMmJhSFNuZ0lBUU9uQnpSazJuVU9RN1E4TWxyd0xudGRhYTYyYjk3dTl0aWc1R1hxSDVRNVVxcFdCSzdlM0RnZnVxbVRYZHJmWWdCeklYblpZcWs1dTNWeTlzVHAvZlBYMUc3Q3JSMndnSzczMmh2cmM0cGI4OHZoNHBUankrTkQ4aWVLV1gwWWJNYTBYcEpmRC85V0I2ZWZxaTFvcWpvelh5djVOWjN4aThxM245VVpzNndIcEI4dmVTNFp2UERpeWNJZ3NwMUFxbFdvUExMcmtzZTBic0t3bnBKZmpNUUE0Y052Q0liTGRRc0YxM3JPNHdVMjNkMlNGMkVIU3kzRUpBSXc5czVCY0lNc3RlSTV6NmVJRy9TL2xMZmRJTGNla0RRQlErV2Z0OUFuYkxiaFdkZW56ajl5WjJyRGVrRnFPcTFwSlZ1bkorWW5Fc2ozZnNTZXFTNi82d283VWx2V0UxSEpjNnJUdS85UTlBQUNBa09ONUR0cnBMTDFxOUxQTzhodU5KcTBjM29YemQvcWZ1UkpCSzVMNlR2Vzg1ZGZkc2l1OWJUMGdyUndqRTZjLzdYam1QQUJBdGxmeW5NdUhsMSszNlU0dnJXbTlJSlVjeUxKR0p4ZU9yajA0Q0lCc3IrQU5iMXR4cVhmenluTUdrMElPWkx1ZVZ6dmpCODdkdDl2SWNqemZPMy9yeXFzdmZhU3dBZk82VFhJNWtPMFBsa2QyRFo0NVUzdDZGMWlPNzVlMnJkYmFnYXZUVzlkMVVzamhEb3h0M2p3OXRPalV0bDlzdDcyU1A3eDl0ZGJHSHhwYTVheWhKSllEMlg1NVlzdldxU1VuYTQ4TyswVnY2OGlxZDN4b09wMXB2U0M1ZDlqZVlHWHNnb2tsNTd3SDczQjk3L3pTcWpkTWZEdy91VWR5NzdEY1ltbGdhbG1sYS9UYnU3emFlMWUvdzk1L1VSckxla0ljT2E1WWNoR3lITWM1ZC9sckEvUzV5WjFydlVvWS8yWXhsVzA5SU00Sy9Oa2pyNTg1c055QjBjcndGWlBMTHhxYnZIek5oNTQ2Y2ppTmJUMGdqbmRjOXFNUEx5NktXNVpWcUs2NHlIbmY2Tm90UERDNDl0K01JbGJzMlB5VGcyZXlMb1JzTkx3cFdTL1QrNUpkM3pQaWhkTHlVMCtjOWcrRUxNc2E4cFAxVXI0L0p5LzBZODRzcFM4L1haMS9JbVRaVGkxcDBlK0tXL09oUit5Sjl2UGZ1cmoxQVNIa2pDYWRuMnNIODFFbWpQMWM2TUIzVG1laXlCMUxuSzdzdmlrWFZlVDR6K1hzK2ZtTkRnQUFRbTd5UmFyM2NDN2NJOG5YZk5rUERnQUFRcWlTWXUvR2pqM0o3K2sraWJ4KzIvYys2UUFBR2w4bnhWaUw4bjNuSkwrcDZ5UUxBZ1BmZmF3R0FNTnBwb2tiOXVZZ2VpU01pY1V2Zm4wVE9Dc0t4TEY0WWx1cTI3cEswaWxpNUw3dmI0RjBVZkdpL1Rsd2ovVkJ5TEtRWHNxTDM5RHBlT25DWGovT0JrRzJWeXo2eXgrcm5sSU8vVlN2bjZjdDZ3ZEZ5eWtVRVQrWlZXZlNVMWsxMVNIV2p4M0lIYWhOakdmV21mMUQwOHVFYmVTd0M1V0pMZG4xdHUrcTdOcnFDRzFtRm1RWFJoTFdOdFpqY0wvaFpjSTJjbWhBM29yM3J1bXg5eHErd1dGOU9iUVNITEljNzl2dk5MdnUwVllPSnJQc3pyM3ZnMGJyMFZZT3lqT2RIQ2NlV2YxVm5TRzBpUjFLTUo2cGU4QXQxMlQ1cTRDc2FlTWRXdktNNWFnOFZEWjR1TFNiV1pUSVdBNjRidG95VjQrMmNzaXM1UmovZENISGNnaktNKzV5M3kyT3NYcTBpMnVLczZ6bGdNZlBzVTNWb3dmZUFkUDNlcWFHanhpeFEyVGRwN052M00ybkhLMDBQV3V1dmJYb21KbDk5RVFPZUhTaVlHYjRhUHNsS1VHejczWEhQV1hQU1BkbzZ4MVNzQTUwZTl2T2ttdWlIakVHU3dlOEE3WmVYekZ5dUxUOWluUkh2R1B3b3hjTStRYnEwZDQ3Wk9ZVExRREFSUitwRGhnNFhOcVh1bFJINVBEdWZvRUlwVTE3MGRCK3NIUkdEaGk3YlpPQnc2VnJjcHljVzNiaS9UdEhCNDBiTG0wSFMxWnkvT05JcGJKdEVsa0xyNjNQdmVZMVFvVXk2M2ZZWFlzZFU2LzgxZjZMTzFMYldod3Fld0FBMGhwcE5vakltUnhhWjFQK0dkOTl2QkhxZC83MVoyK3dVdG04dlFJbjN2QUtybWtyMi9iZWtWSDBSMU83RHdVQ0VDQ0VrTzJVbkZNaHpyWklud1Zka3dQZ21qY09CUW8wc2l5RUxOQ0NoblhUeGtvMzViQnZmdUZQRVpkZ0lXUlpvQ1JuT01paEhKbVZqcXNQSFQ0Wk1BV0FFQUt0bEJUY3NJbWx6WFlYQUFEa1pyZUcrOE9UcnpXcDBvQVF6RzhJeXF6cGJHaWZCMlZwOGdmMjEwcU9sb0l6eHJtUXB2bEdySjJER2RyczNyRjdiTWkzd0VDL2FCRmp0MEtXaHAvN1NPTkZCTlMwQ0xwQWpLMmVLTXNOZjlYcXY1azBjSlRNMCsyOWEyajZPb0tRMXRKTVFibzhXQURjcWI5cFVKcVk2U0JkMzltb1JGa296Z1hQcXh3YnRsdnJONUVGTnJJc0FIM3NGVytZUlFIdVRGRnBvM1RITzA0OHg1Q05iTXRDUEl5UVV5aDVocjdFNzRZY0NPMkNRd0FhbE5aYVNVbVpvWUcwVzk3aFhGWDQvU2tsaEpCU0NFYUNXV3hvNWhISFp6T3gvRC9QSHNVUnBveFJRcUt3Z1lWeHRRNkFMc29CNy96czhNbDZRQm5ubkRObXBocGRsQVBxUC8zMXNibVFDYUdrTWpQcnlQWmZQN2VoY3RmSENnNEl4cGd3TnBURytYbmFWekxxeTkvbHZ5cVZNblUxQzlCZE9RQXVqbzViRm1SYlE4bVU3c3BocVRkdDEwWmFtYXBIZDljc3FGeUZnY0dpTnhPWjkwNEJBTG90UitPSU5lejduaU9FTk5NL3VpaEhXSzhmZmgwODJ3TFdDTFA5bVV4bWRFRU9Mb1NjL1Y5OUxtZzJKU0N3WGIvZ093aTlDNzFEek14aU1qdlQ1SlJUQmExVm5PU2NTNVZ4VVNrck9pZUhlUFcvOVFZT3VZTDVGRlNEVmxKd1RtWm5tdFRNc2RJQk9XaEV4YW1qN3pRaVdKSjdhcVdVNUpRUUVzNmRtcVdHNXFXWnloR2VPTlhBelhxVExWdSthNjFiNzVwdzJBZ3h4aEUyc3pTWWxSeTZ5ZXJIVHJ3ZHlsVTJ2Mm10cFpLQ2tRaEhZUkJpeHJrUVprNnpHNVJEVXE1Sm94SFU1MmFDMWRNcXJiV1NnakZHbzZBUllVb3BsOHJZbkhRRGNvUXpZUlRNekRGSzJab1pwdFpTQ3M1SUdFVTRpaUxLaFpRR2F3RXA1WGpyNkd5ZHpHQ2wxNnVGYUtXVTRJUmdIRFJEUWhrejJ5OWFKSkdEQnBoRng0ODNJOVoyWXRCYVNjRVppNXJOQUdOTWhjaUJGaEJmanIrLzNDQ09wRXpHZUoyb3RaS1NVNEl4RGhvaFpweExvNHNjaTRnang0OS8rOGUzMWVENDFHVFphMXRMMUZwckpUaWpPR3cyTVNHWTVVY0xpQ2ZIdlFEZ0tNR0YwdXZMb1VGSktTUm5PQXFESU1DTUN5SHpvd1hFSHl4YUNpYlhyVkhNejZtRVVvcURJTUlrRjdGekdiSGxVSUt0czdGTmF5MGxGNXlHelFBVGlpbmpwcytwcXhKZkRrNzU2bEZVZzlKS1NrWUlJVkd6R1ZFdThxa0ZKSmhvVzk2eEluaG8wRW9JSVRpTG1zMlFFa0tZVUxrYkl3dkU5ZzR0dVZnUlBMU1dTbktLQ2FVNGJJYVVTUzZOcldYRUliWjNhQ1dXRFpiVHFSWU9tZ0docld3OVIzUHFxaVNSZ3kyYWFiVldVZ2hHb2dpSFFZQ1psTUxnSFhDeFNTcEg2N05XU2dwQ1NCUTJRa0xJZktxVmV6R1NyRm1Vb0Z4cTNmcnhwQkFNQjgwZ3hIbFlwaVlna1hkd0lhR1ZhMkdLdzBZUTBUeW1XdXVSeURzb2RaQVFuRVNOQUJPQ0tSZG5sUmFReER1MHBHR1RTMElKRG9LSWNTSEVXYVlGSlBFT0xYQmQyU1FpakZIQ2hkSjV6aS9XSXY1K1J1UVdod3JBS0JkU25vViswU0xCOWs3Yjlod3RwTlJLbjRWKzBTS0JIQWhaU0orVlF5UXRabTRWN3RNcC9nK1ZCbzZRRjFoekFBQUFBQUJKUlU1RXJrSmdnZz09IiBoZWlnaHQ9IjE0OCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ieE1pZFlNaWQgbWVldCIvPjwvZz48L2c+PC9tYXNrPjwvZGVmcz48ZyBjbGlwLXBhdGg9InVybCgjMGJlZjJmYTdkOSkiPjxnIG1hc2s9InVybCgjZTFkMjgzNWQ4YikiPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEuMjg4ODg5LCAwLCAwLCAxLjI4NzE2MiwgMjEuMzE3OTU2LCAxLjMwOTQ2OSkiPjxpbWFnZSB4PSIwIiB5PSIwIiB3aWR0aD0iMjcwIiB4bGluazpocmVmPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQVE0QUFBQ1VDQUlBQUFEdFdWQmpBQUFBQm1KTFIwUUEvd0QvQVArZ3ZhZVRBQUFSNjBsRVFWUjRuTzNkZVhDVTUzMEg4Ty92ZWQ1akw2MHVCQWd3QmdRR2N4a2JLQkJmM0FSc2crdWFwc0ZIcVRPTzA5UnhIVGN6VFpxNmNkUHBkQ2J0NUNCdDA5WnRKdE9tYVhBbnliaHhmUjlwRWp1eFc4ZkJqc0UyeGdaalk4NElJYVE5M3ZkNWZ2MURFZ2lReks2MDJuMTM5ZnNNTTdaV3UrOCtrdmE3ei8wc0lJUVFRZ2doaEJCQ0NDR0VFRUlJSVlRUVFnZ2hoQkJDQ0NHRUVFSUlJWVFRUWdnUlJWVHBBbFRNUjYrcis2MDFhbXdqTFpwRDJReWFMbSt2ZElsRXBLbEtGNkJpV3B2Tjk1NndWeTVTMlF5ZWVPN2t6ZGVNM25jTklRYTFlWU1QZ0Y5dDVGZUlYOGFqMzlBQXByUld1bGdpd2tacHJiTDBFdStCdjBzanpFRXhOTlpkaWVVTHNlRnFwOUxsRXRHbEsxMkFDdmorTjFKTDUzdkxMNHVEVHZWUDFOWWJVOGM3ckliWitWWWx5eVlpYXpUV0t0YlE2L3Z5WUFhZnVzM0EyZ2VmeksrOTBxMWd3VVNVamJwYXBiVVZNeTVValVsMzl0UVRJTnQ3S3dHd1N4WW1qbmZ3dkl1OXAzOGVWcktJSXBKR1hhM3kvdnQ0N3JYc2phc1ZLRGp6TzJaeXM5bTVWeDA0SkRrUkF4aDFVUUd3WnBZUHpnendEWjFiTXBmLy9qdkJKejdpbGIxUUl1cEdZMVJ1M2VRQ0ExWWR2SHFwM2ZIOTFHVnpaSTVGbksyYW9ySmhidStiL1dmV3h1OWFIUnZ5ZFpRT0I0a0t3T0g4MmViNkZXcjN3NmtoWDEvVXBLcUp5c09md3VwWi9MY2ZyV3YvY25QZThxVVQxWDNYRENVdGE1Ym9lRHdZZkVHUFJSQjJkT29qM2ZuNzdodDZhVVh0cVpxb3RDUzhXYTNCelpjRjJuVDh4WWJZdnFOMllwUGR1cnpvNjl5NXhYY2NNK2kzQ2FEZ2d0Ymc4Vi9sYmVlb0d4NFVINkJxb2hKemVQYVlsREpaOGtORngvOW9sZlBzL3Z6Nmk0b3JmMk1kcmxuWmZaNDFvZ1RmQzhJRC92RmovSUgzRTZOTDFVU2wzb1ZXR2VycHJXZ3d1cmRkNjdZbStibFBGM0dScFF0VVFSMTJ0cXVXQk51K1pSdnJobEpVVVpPcUl5cmJic0R4N2dDQlFkOHFMZEtXVGVDQURiQnRjNkhYdVhzTFZDRS9NV0g1RXA0MkFadFdWc2Z2UjVSQmRid1UyTktQM2tUYTczY1RRZm1ZZXdGZWVoZkhUbURtbVBOZnBDbXQ1czBvZUJTWWVjOWovdXFsZFBjdE1zY2lnR3FKQ2dBMm12d3piMUlBc0dpOCt1Nkx1SG5KK1RPd2RobGFXZ2J2MEo5RkFaejd2NTE2NFNSNzMvTGlpaXBxVWhWRVpmWnNXSmRKR1RxbnNPUmc3aFQ3NkYwcUhhZTdWNTNuWjdubmQxMm5xRlgyR2wrNmgvYjhMRXhNbGpXVW9ocWlFZ3R4LzZ2WXVtemd3cEtENXJpNmZxSCs2bE4yN2NXRFhtVEpYR2ZtMUlLcmxENnVhMXV1VExnK1poZjdTRkZ6cWlBcXg5clJrQU9EQmk0c2dkeXd3US8vNWdaTWE2YlpMUU5mNU00dHNYUzYrSFdRRkg1eWk3Ny8vdUNPUDBnVS9WaFJXNm9nS3Z1T2dBMUlEVDRocUtEQXYvY2g1OGV2ODJVdHF2R2M3NDhmb3hiT3RBTTg4UHdZSFB4aTF4aS9FY3VYRCtrQ29sWlVRVlFBYkw4dGRtNUg1UXdPUElVWC9peVcyMm5QUFhsbDlSSnZ4dlNCbGhJWGdyTyt4bmQvMm4zVkFoa0tHOVdxSXlwNTY1eC81bHlGSnBmLzNPZlB2dGx6Y05NbXQ2RHBsRUdmL3NTOVcxT3REYmh0NHpBdUlxcGNkVVFsaENGOXZwNkdnbkxzOUxHNGU5VVpOeStkcStaT0M1UWF4aW9WenE5Y1JQLzdpL3pHTlVOZnppeXFYWFZFaFVPTlFsN3FDbVJ4NzNxMThNTFR0NjFab2hzYmhyZXhVUUhJL011WEdnNGVHVnFIUjlTQ0tvakt6UEVxNWhXOHlGZkJnZjMyeDNxL2NoV1dYWUprYk5oN2dNbkE1RDd4eGZ3WFBpVTlsbEdxVEZINWlPdk9VV3JPa0hvTVN5OTA0NzR0OU1oWWduSXhNWUUvM2dBQWkyZGgwUUl1eFhHekRNN3o3bFJMSFc5ZU52eXJpZXBUcHFpc1ljelYrbFZybHhlZmxobGpWZEx2TE9JQkJISncxK1ZZUEEyYjE3cjFRNWhPR1poQkx2eWZaNEw1YzB0MFBWRlZ5clI3NmVQS3V3Vjh2ZWZkRndUWEt2MEdGOXJKZGhRK2VWVzhyU1ZmWEtnSm5zYnEzNGhmc2RiRTRpWHFZQkNBTUpaRUdDTGhZdWZlMGx4VlZJc3kxU3J6eVNHS1Q3VTQ0Q2Nmc21ZRDlQVENIdGlVVU5PYWg5STlJQWRUSm1UcWg5bWhQL3VpdUc0RlBmTThMcG91NTFTTU9tV0tDc0VGdVdUZGtNMlRLdjRHekUyZ2Z5emdnUzBwMVZLZkdVSm5nd2pPT0ZESlg5S0tyL3V3WHJrS0JkZUxva2FVNjBEcm5zbDI1UkdyaTdqN24rRzhqdkFnc0FGNCtBTWZ0K1JDN2V2c1VCTHRRcVZSMEJCelVRaTNYQWZNNXYvOHBqUG9zUytpRnBWOXNKZ2MwcWxwb0JWQU0vQXdzRTRQMmw5U3dNSkpyak9FTWxyb1pxamtjQW82T0ZiWW5mN3RqNFUzckplVDgwZVJTc3lyS0VWT01xYmo2NVg2aXVjdEozclE5d2U4bzFhWTFJanpyUDQ2RndNTWIvSUlWQ2s5S0lDbGIyK0x6NXBPbXd2ZXF5eXFYWVdtSUpVbW5YQlZmQlB6YksxM0didCtvRUZrcGRDYXppbFY1QkFXUTlWQk5RQWpON2R1T2pkZTd1dytHS1NLMnl3bXFsZ2xaK3RKeFJ5ckw0R1RBRDlpN2RwejdwQndrWENIOG5tVjd0UVJxMUo2MmJwNHRqVVdXenhIemdvYkxTcjhwa2c2cWNOd293a0RoTzNBTWVERmZ0L2ROTXVwVHhROTEwNXg2Q2FnNkMyUFJiTDJhL2ZHWHRrVnZ2bFlhdnE2a3lQOFpLTHlJckFHVER0YXgyNkVXcVZ4MXJGYmw0Nm4rdm9pUjVrWVRpTlVPUlpxR1FUWlJFdy84NEtNZzQwS0VZZ0tBTzBvcjNFYU8vK1VWT3Y2N2N3ZG4xSlVmSDlEanluTFo0d1R3RUhyT0xyOTN1eTFLNlFaVnZ2SzlEZStSNTkvYnpvcDN6Rm1ROHJmWllJOUJ2VWU3cjRxTnFZcEtDTE9EQldIT3hWVXJuYWxxM2hDcSt2N3BuVXE3OXhacGljVkZWR21XdVhmVGJhQWV4RlIwbW5QZnkzdUwvUmhETVkxaGNVVjBNS1pBRlcyL1ZjRVVMQjFmZkRtVWRzZzV4L1Z1akpGNWJPbXE3QTdFam4xeVU3OFd6eng1L084aHJHNUlwcFNESEtobTh2Uyt1ckg4M2xLRWd0bnlhcXdHbGUrUC9CK3I3bUllNXZRcmpiTm0wNXk0WDFtaGg2RDJEeVFNOUlqeGVjSW5UMHZtYmE5VFBlVjkzbEZHVVdqVzMrdU9wMXNMZkwxcnFESGdMeXk1d1JnQ3R2Mjh1TkVjZ0JTRFl0b1ZDZ0dkMHFHQzU4YllhZ1luS2FSbktFZkhCSGFWN2wvOVF6UG1CRFIzNmNZdm9qK2FjbG5sU3F1ZnRDTm9IZ0ZxaFFBVUdoc0RLOVo1RXlzcDJXVEtsRUFNZklpR2hVOTFoWTdqcTNIanNEdWxNSVI3dG5xUC9aRDB6WlR4c0pxVTBTam91b05kTUVWaEFVbG9CTGxIdnM2RXhQQ2Rac1NqYzB5RkZhYklya3dWa0UxbXFMYVVzNFlxRVNGV2w5OWlJTFAzeEZ6NTNldnZkeDUvRmxaN1ZKcm9saXJrTStxdGVEVGpCalFjTVpXdGtycFlUVmxmL1ZmZFk4L0d5NmFWK215aUZLTGFGUjBTeEh2eWlvRjNWeVpzYSt6RU9VdW1tSi9md3NtanBWVlliVW1pbEdCeTZyZUZONmE4cWFNWUZtS1EzQW9lK2RONlFlZk12WDFsUzZNS0trb1JrVzFNaFU4akVRZVZIcmtkNmNVakpScHV5Q1lOdzhkSFpVdWlpaXBLRWJGWFJnVVdxVXdkQ01vWXVmVE96QVBmVjNxbEZvVHlhaE1MSGllM2tLUExmNmNpaEdtVlg1TVhYNysvRXFYUTVSVXhGNWxBRnlvQmk2b1ZyRWdGMDQwT3ZSbklDUmltUy9lRWE5ME9VUXBSUzRxZXBZcHRGQU1kd29LNzlXVTJTVlQ4OU1uVnJvUW9uUWlGeFczcmJCaFlnWUFOOEt2eFFzbm01VWZxblFoUk9sRUxpcDZiTGJRUHIwYnVWNUtmd1Q4OWFmZHlaTXJYUTVSSXRGNnJWR0tWYkt3amdvQkFmSjcwYnYzaS9yK1JRY2hYUjk4NXk4SFBqaFRWSjFvUlVXMVdFb1ZmRytOL0Z2SS9CeTUzUWgvRGRzTjVIdXVFcUVmYTk1MFhEcTcwb1VRcFZDKzlSZUZITnJpVExIZWdod1Z2cVpZZ2ZPdzdRZ1BJRHlJOERCc04yd25FSjZ1WjBoVnNzTHhmWlAwRXo5NEtxak0wNHZTaWRMS1lnS2xReFR3Q2ZWbjZLdEFPQVNIc0NkN1ArQ09mSkFQVlFmbGcxSWdIenJSOTg3QVpWMkQvT0Vyd2t0bU9UdGVrN1hHMVMxS3RZb0hiMm5PbVREVWx4VDErOGZnUExnYjlqak1VWVFIWWRzUkhvRTVEZ0NrUVRGQWxTa3cycUZKcmZIdEQrZkw4V1JpeEVTb1ZpR0g5ZGpTelNiMmIzUXhiQmR3RWpnR2N4RGtndUpRaWQ0OXh1UkR4ZnJ1UEFJVmp1K0ZpK2VZU2VQMXV3Y2pzMUpORkM5Q3RRcjU4Sy9PcWRnSXpMMzNyM0FzT0FSbllEc1JIb1k1Q0hNRTVpaE1CMkJBRHNnRGRHL1ZWQ29KMzdaTmltOS9WQ3FXS2hhaFdrVzFHUlViK2U3dm1mMTd0dUJ1Mkc3Z01JSzN3UmJrd1dtR013bE9BK0NlVVRVTk9UeU9ZMVovaUZjdmM1LzhtZlR2cTFXRW9xTEgyYktkTlR6UTB3TTl1V0NFaHhFZUFoUlVHcm9lRklOT2doSWdGM0Q2aHRTS2pFMWRvdXRQUDU3NDZVdEJ0cEFqYVVYMFJDa3E0MDBaMjRPRG85TURaYllUdGhQZzB3MHpsWUpPZzVJNEZ0VDdjZHRRM3drdWJDU2FNS2N0dDJLeGV1UW5VVnZkS1FvU2xhaFFJNnMwbDdhSE1GeDArbi9ZZ3JPQWhUMkI4RDBBK1BHNytudS96TFZkRUo4N3c3bDBEcVpON1NTRzBxUUhueFFhMDJ5MnJOT1AvS1FjWlJjbEY2bW9STDRkZjJvUkFHTkJZL2VYM3dtMlAyMFNNZFdVUWpLaDVyWmgzUlhlWmZOTVhaenEwOVNZRGozWEFLY2pad3phNWVPOXFsWlVqdmQyRm9lcEd6b1ExUlgxNTJKRHU0OTZ2L2tQd1R2SFRqZW9sSUtqME5Lb0xyMVl6Mm5EdEVuaHZEYTZlRG9hNmkwWUI0L1JWYmZTN3YzU0FLdEswWWdLd1Z1UlQyN3NMT0xjK3lnd2VIcTNlK3UzZ283dVFlL2krMGg2dUdBQ0doTHF4ZGZzeVV3Wml5ZEtLaEx6S2xUSDNzTFFtUmhFYmovakIxT1luTGFaVUQyN1o5RCtpVEhJNUhIb0dQWWQ1SHgxdlJHSU0wVmlDUzdGV1kvTEYzSHVmV1JvRjM5NGhiM3Rpa2o4R3NXSWlzYmZPTTZxemtabzdLdHdoSFFLbjF1cEZrMk55Z0NKR0NFUmlBcEIxVEZWN3c0b2pYSHA4T3ViMFZMNFRodFJoYUlSbFhGY3hMbjMwVU1lTGg1cnZ2STdDYmQ2UnZCRXNhSVJsYWFBZEhYMTZNK21QYjY2TGZ6c3RWS3oxS3dJUkFVZ0wyTGI0b2VrSVo2L2VRSFBuaWcxUzIyS1JGUTRFNUdDREk5Q2ExMzMvVnVTVGFrb0xHVVRKUmFCZVJXRy9iV21OTU1EUXNVaGNVaXdCTzdaelFpY3FuTE82czVFcnlJaWhYbzNlUG1BODVyczRxbzUwWml0QitCQmpiZmtNcm5jczdhWEZNanBuYlNqSnNCbjhrQUpwaGdEb0JpVEMzaE1EcWhuTzc2MnBQdGVvQm9nVVA4ZFhYMC9LQ253dVR0UFNqZW1ZUEw2djNjbWIvM21DY2xLalluTWJFQWU5cDF6RzJGOXhUdjFXcWN6RnZ3Q1RPaTdKUTVLTXRVelhGREtrZ3RLVzRvemFaRFBBQ2plR3dpVjZxbXFXTVZ5dlZlS2dWVGZxVWdLZEc1ZHkrQ2VjWWYrTSs0REhRUmpRaHpyNUNvZXpoT0RLRk5VSG5EU3czcjhvRHNRNmZUTmVYQUg0VURQRngvVXNLUjZoZzg0SUQvUlc0bDVJSjlCSUkrQnZtZ2xBY1hrTTNtQXR1UUY3SnIzZ3BUMXV4UXhHZElhU2tNckVJR0lRTERBcnNQZUZ4N3FxdTdoUERHUU1qWEF6dFA2aWlZUElKRG1udVljRTF2YjhYeHo4alB2ZFIwTHJBSTBRU21RVWpNYWtmYkkxWGpsQ0IvdHR0MnloYjRXU1ZTS2srZU9aNU44NjNIcGlZdzZOVEJHVzFZZTZsWjBPQS9FMEN5L3VWRkcvdUJGSWdVbnNTeXMyKzZySlhHWlB4bEZKQ3JGSXdYbHpReVMyNVI3WTBybTVrZUxNcjB2Rm5LMmQ1VWhYUmZZWlk0S3RmcGxhR1IwdU9aSnJUSU1PcGJPNlhzQy9oTlhXbUsxVDZJeUxLUzhKQ1Z1RCtpclduNlROVTcrd01PbU5PblVSc3UzeTI2Vm1pWlJLUVd0SFlwZmswaElWbXFZUktVMGlKSEkyZWl0ZFJZbEU1bmxrdFhJR2pBekFnQ2RQdjZEODdLaXBZWkpWSXBrTFpzdXdBQUFjeVpaM3c1OUtKZjVBZFMvNWlRcHRVeWlNZ2htbkRyQUw4am5WUzdrbmkxbmJrZXFicS9OdjVuTHZXSE4wZXlKOTRoMmhhR1Y0L0JxblVTbEh4UDB0S1lBQkVSSE9XaG43bWJiUlhUWWRmZFkrNFFKc3h6a3V0b3pRSmUxc3RKK1ZCbmRVYkhtZEdzS0NPSHYwc0hyNFAzQWZzWmg1amVzUGR6enZaeVJZSXh5b3lNcWJQcHZEY3VHbmQyRUhCQXdQMCswZy9rdDVuZUJROGdneE9CSGRZdFJyZWFpd2d3VEFtRGtBUkE4QmpxUmU1K0R3K0Fqek51QmswcTFBeWVBREhOZTl2YUt3bFIvVkt4QkdESzZlcitNTlhXbXZHeG9EdVg0VFd2ZTR2QkpZM2YyZGRENy9pT05LVkcwYW9rS3c1NXVSQmx3RnBuQXNnVm5QYjg5bFdnUGFIYysrM0pvaitUYjkrYXhYL3Jjb3RRaUhCVVRNcC82TkY3VnBkVlI1RThZMHdWMCtQNDdSci9OOWtkc2dud3VtOC9sck0zM1ZCclNuaElqSTBwUllVWndzcWVQQVlEY2h2Yzg5L1VnK3o2d2oyMkh0VHVZOTFyYkRTQWpIMzRseXExTVVXRWJrT3BiVE1nTURrKzkvK2M1YzlMYWs0UWNjTUxWYjhONXhkZ2RzTWZOOGM0TVRsb1praEtSVUthb1VNemg3czYrcjNTZXcyNE9qZ0E3Z0gxSzdXRzh3UFlFWUsyMVo1NUtKMFJFbEtzQjVrQlBHaytkeDNPWkV6L000cTcrMzVJZXVLZ0daVnFFcjlJcDVMS0djQkRPSTdKVVhRZ2hoQkJDQ0NHRUVFSUlJWVFRUWdnaGhCQkNDQ0dFRUVJSUlZUVFRZ2doaEJCQ2lCTDVmNFdxbWlmbCs2d0dBQUFBQUVsRlRrU3VRbUNDIiBoZWlnaHQ9IjE0OCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ieE1pZFlNaWQgbWVldCIvPjwvZz48L2c+PC9nPjwvc3ZnPg==";

// src/components/layout/Sidebar.tsx
// Sidebar collapsible — ouverte (220px) ou réduite (52px)
// Se collapse automatiquement à l'entrée d'une fiche client
// ─────────────────────────────────────────────────────────



// ── Types ────────────────────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  section?: string; // label de section affiché au-dessus du groupe
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeNav: string;
  onNavChange: (id: string) => void;
  cabinetName: string;
  userEmail: string;
  isAdmin: boolean;
  onAdmin: () => void;
  onSignOut: () => void;
  // logoSrc : base64 ou URL locale — jamais depuis Supabase
  logoSrc?: string | null;
  colorNavy: string;
  colorGold: string;
}

// ── Icônes SVG inline ────────────────────────────────────────────────────────
// On définit les icônes ici pour éviter une dépendance lucide-react au départ.
// On pourra les remplacer par lucide plus tard sans toucher aux autres fichiers.

const Icons = {

  dashboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1.5"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5"/>
    </svg>
  ),
  clients: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="5" r="3"/>
      <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6H2z"/>
    </svg>
  ),
  contrats: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="1" width="12" height="14" rx="2"/>
      <path d="M5 5h6M5 8h6M5 11h4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  agenda: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="3" width="14" height="12" rx="2"/>
      <path d="M1 7h14M5 1v4M11 1v4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  conformite: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1L2 4v5c0 3 2.5 5.5 6 6 3.5-.5 6-3 6-6V4L8 1z"/>
    </svg>
  ),
  ged: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/>
      <path d="M10 2v3h3" stroke="white" fill="none" strokeWidth="1.2"/>
    </svg>
  ),
  carte: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2l4 2v10l-4-2-4 2-4-2V2l4 2 4-2z"/>
      <circle cx="6" cy="6" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  marketing: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M2 11L6 7l3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="13" cy="3" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  commissions: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="8" r="6" stroke="currentColor" fill="none" strokeWidth="1.5"/>
      <path d="M8 4v8M6 5.5h3a1.5 1.5 0 010 3H7a1.5 1.5 0 010 3h3"
        stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  admin: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1l1.5 3 3.5.5-2.5 2.5.5 3.5L8 9l-3 1.5.5-3.5L3 4.5 6.5 4z"/>
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="3" width="14" height="12" rx="2"/>
      <path d="M1 7h14M5 1v4M11 1v4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  chevronLeft: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  chevronRight: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 10a2 2 0 100-4 2 2 0 000 4z"/>
      <path fillRule="evenodd" d="M8 1a.75.75 0 01.74.637l.205 1.434a5.02 5.02 0 011.298.538l1.215-.73a.75.75 0 01.952.131l.849.848a.75.75 0 01.132.952l-.73 1.216a5.02 5.02 0 01.537 1.297l1.435.206A.75.75 0 0115 8a.75.75 0 01-.637.74l-1.435.206a5.02 5.02 0 01-.537 1.297l.73 1.216a.75.75 0 01-.132.952l-.849.848a.75.75 0 01-.952.132l-1.215-.73a5.02 5.02 0 01-1.298.537l-.205 1.435A.75.75 0 018 15a.75.75 0 01-.74-.637l-.205-1.435a5.02 5.02 0 01-1.298-.537l-1.215.73a.75.75 0 01-.952-.132l-.849-.848a.75.75 0 01-.131-.952l.73-1.216a5.02 5.02 0 01-.538-1.297L1.637 8.74A.75.75 0 011 8a.75.75 0 01.637-.74l1.434-.206a5.02 5.02 0 01.538-1.297l-.73-1.216a.75.75 0 01.131-.952l.849-.848a.75.75 0 01.952-.131l1.215.73a5.02 5.02 0 011.298-.538L7.26 1.637A.75.75 0 018 1z" clipRule="evenodd"/>
    </svg>
  ),
  logout: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

// ── Navigation items ──────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  // ── Pilotage ──
  { id: "dashboard",    label: "Tableau de bord",     icon: Icons.dashboard,    section: "Pilotage" },
  { id: "direction",    label: "Dashboard direction",  icon: Icons.commissions },

  // ── Entreprises ──
  { id: "entreprises",  label: "Entreprises",          icon: Icons.clients,      section: "Entreprises" },
  { id: "prospection",  label: "Prospection",          icon: Icons.marketing },
  { id: "carte",        label: "Carte",                icon: Icons.carte },
  { id: "marketing",    label: "Campagnes",            icon: Icons.marketing },

  // ── Alternance ──
  { id: "pipeline",     label: "Pipeline placement",   icon: Icons.agenda,       section: "Alternance" },
  { id: "suivi",        label: "Suivi tuteurs",        icon: Icons.conformite },

  // ── Planification ──
  { id: "agenda",       label: "Agenda",               icon: Icons.calendar,     section: "Planification" },

  // ── Administration ──
  { id: "referentiels", label: "Campus & Formations",  icon: Icons.ged,          section: "Administration" },
  { id: "parametres",   label: "Paramètres",           icon: Icons.settings },
];

// ── Composant ─────────────────────────────────────────────────────────────────

export function Sidebar({
  collapsed,
  onToggle,
  activeNav,
  onNavChange,
  cabinetName,
  userEmail,
  isAdmin,
  onAdmin,
  onSignOut,
  logoSrc: _logoSrc,
  colorNavy,
  colorGold,
}: SidebarProps) {

  // Initiales pour l'avatar utilisateur
  const initials = cabinetName
    ? cabinetName.slice(0, 2).toUpperCase()
    : userEmail.slice(0, 2).toUpperCase();

  return (
    <aside
      style={{
        width: collapsed ? 78 : 330,
        minWidth: collapsed ? 78 : 330,
        background: `linear-gradient(160deg, ${colorNavy}E0 0%, ${colorNavy} 55%, ${colorNavy}F5 100%)`,
        boxShadow: "inset 1px 0 0 rgba(255,255,255,0.09), 6px 0 24px rgba(10,18,30,0.45), 14px 0 40px rgba(10,18,30,0.18)",
        borderRight: "1px solid rgba(0,0,0,0.28)",
        position: "relative" as const,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        transition: "width 200ms ease, min-width 200ms ease",
        flexShrink: 0,
      }}
    >
      {/* Reflet 3D gauche */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(to bottom, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 40%, transparent 100%)", pointerEvents: "none", zIndex: 1 }} />
      {/* Ombre portée droite 3D */}
      <div style={{ position: "absolute", top: 0, right: -28, width: 28, height: "100%", background: "linear-gradient(to right, rgba(10,18,30,0.30) 0%, rgba(10,18,30,0.09) 60%, transparent 100%)", pointerEvents: "none", zIndex: 10 }} />

      {/* ── Header sidebar ── */}
      <div style={{
        padding: collapsed ? "18px 0" : "22px 20px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 14,
        minHeight: 96,
      }}>
        {/* Logo IFC SVG — fond transparent, toujours visible */}
        <img
          src={LOGO_IFC_B64}
          alt="IFC"
          style={{
            width: collapsed ? 56 : 72,
            height: collapsed ? 56 : 72,
            objectFit: "contain",
            flexShrink: 0,
            filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.20))",
          }}
        />

        {/* Nom + slogan — masqués si collapsed */}
        {!collapsed && (
          <div>
            {/* Ligne 1 : KleiΩs + IFC alignés sur la même baseline */}
            <div style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              lineHeight: 1,
            }}>
              <span style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.3px",
                fontFamily: "Georgia, serif",
              }}>
                Klei<span style={{ color: colorGold }}>Ω</span>s
              </span>
              <span style={{
                fontFamily: "'Nunito', 'Poppins', 'Montserrat', sans-serif",
                fontWeight: 900,
                fontSize: 22,
                letterSpacing: "2px",
                color: colorGold,
              }}>IFC</span>
            </div>
            {/* Ligne 2 : slogan */}
            <div style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.80)",
              letterSpacing: "0.2px",
              marginTop: 6,
              lineHeight: 1.3,
              fontStyle: "italic",
            }}>
              Piloter l'alternance, placer les talents
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: collapsed ? "14px 8px" : "14px 12px", overflowY: "auto" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeNav === item.id;

          return (
            <div key={item.id}>
              {/* Label de section — masqué si collapsed */}
              {item.section && !collapsed && (
                <div style={{
                  fontSize: 9,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.7)",
                  padding: "10px 8px 4px",
                  fontWeight: 500,
                }}>
                  {item.section}
                </div>
              )}
              {/* Séparateur si collapsed */}
              {item.section && collapsed && (
                <div style={{
                  height: 1,
                  background: "rgba(255,255,255,0.07)",
                  margin: "8px 4px",
                }}/>
              )}

              {/* Item de navigation */}
              <button
                onClick={() => onNavChange(item.id)}
                title={collapsed ? item.label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: collapsed ? "10px 0" : "10px 14px",
                  width: "100%",
                  justifyContent: collapsed ? "center" : "flex-start",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: isActive ? `${colorGold}25` : "transparent",
                  color: isActive ? colorGold : "#ffffff",
                  fontSize: 15,
                  fontWeight: 500,
                  transition: "all 0.15s",
                  marginBottom: 2,
                  position: "relative",
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLElement).style.color = "#ffffff";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "#ffffff";
                  }
                }}
              >
                {/* Icône */}
                <span style={{
                  width: 20,
                  height: 20,
                  flexShrink: 0,
                  opacity: 1,
                  color: isActive ? colorGold : "currentColor",
                }}>
                  {item.icon}
                </span>

                {/* Label — masqué si collapsed */}
                {!collapsed && <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>}

                {/* Badge — masqué si collapsed */}
                {!collapsed && item.badge && item.badge > 0 && (
                  <span style={{
                    background: colorGold,
                    color: "#2B2B2B",   // anthracite sur jaune IFC
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 20,
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            </div>
          );
        })}


        {/* ── Bouton Admin (si admin) ── */}
        {isAdmin && (
          <button
            onClick={onAdmin}
            title={collapsed ? "Admin" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: collapsed ? "8px 0" : "8px 10px",
              width: "100%",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color: colorGold,
              fontSize: 14,
              marginTop: 8,
              fontFamily: "inherit",
            }}
          >
            <span style={{ width: 16, height: 16, flexShrink: 0 }}>{Icons.admin}</span>
            {!collapsed && <span>Admin</span>}
          </button>
        )}
      </nav>

      {/* ── Bas de sidebar — utilisateur + toggle ── */}
      <div style={{
        padding: collapsed ? "10px 6px" : "10px",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}>
        {/* Carte utilisateur */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "8px 0" : "8px",
          justifyContent: collapsed ? "center" : "flex-start",
          borderRadius: 6,
          cursor: "pointer",
        }}>
          {/* Avatar */}
          <div style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            border: `2px solid ${colorGold}`,
            background: `${colorGold}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 600,
            color: colorGold,
            flexShrink: 0,
          }}>
            {initials}
          </div>

          {/* Nom cabinet */}
          {!collapsed && (
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.85)",
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {cabinetName || userEmail}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>
                Centre IFC
              </div>
            </div>
          )}

          {/* Bouton déconnexion — masqué si collapsed */}
          {!collapsed && (
            <button
              onClick={onSignOut}
              title="Déconnexion"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.6)",
                padding: 4,
                borderRadius: 4,
                display: "flex",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >
              {Icons.logout}
            </button>
          )}
        </div>

        {/* Bouton toggle collapse/expand */}
        <button
          onClick={onToggle}
          title={collapsed ? "Ouvrir la sidebar" : "Réduire la sidebar"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "6px 0",
            marginTop: 4,
            background: "rgba(255,255,255,0.04)",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            color: "rgba(255,255,255,0.6)",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
        >
          {collapsed ? Icons.chevronRight : Icons.chevronLeft}
        </button>
      </div>
    </aside>
  );
}
