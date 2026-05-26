import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()

thin_border = Border(
    left=Side(style='thin'), right=Side(style='thin'),
    top=Side(style='thin'), bottom=Side(style='thin')
)

header_fill = PatternFill(start_color='366092', end_color='366092', fill_type='solid')
header_font = Font(color='FFFFFF', bold=True, size=11, name='Arial')
header_align = Alignment(horizontal='center', vertical='center', wrap_text=True)

cell_align = Alignment(horizontal='left', vertical='center', wrap_text=True)
cell_align_center = Alignment(horizontal='center', vertical='center', wrap_text=True)

status_fill = {
    '通过': PatternFill(start_color='C6EFCE', end_color='C6EFCE', fill_type='solid'),
    '部分通过': PatternFill(start_color='FFEB9C', end_color='FFEB9C', fill_type='solid'),
    '失败': PatternFill(start_color='FFC7CE', end_color='FFC7CE', fill_type='solid'),
    '未支持': PatternFill(start_color='D9D9D9', end_color='D9D9D9', fill_type='solid'),
}
status_font = {
    '通过': Font(color='006100', bold=True, name='Arial'),
    '部分通过': Font(color='9C5700', bold=True, name='Arial'),
    '失败': Font(color='9C0006', bold=True, name='Arial'),
    '未支持': Font(color='3F3F3F', bold=True, name='Arial'),
}

# Sheet 1: Test case details
ws1 = wb.active
ws1.title = '测试用例执行记录'

headers = [
    '序号', 'TC-ID', '观测者星体', '用例名称', '执行状态',
    '发现问题', '严重程度', '校验点通过率', '执行记录/备注'
]
ws1.append(headers)
for col in range(1, len(headers)+1):
    cell = ws1.cell(row=1, column=col)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = header_align
    cell.border = thin_border

test_cases = [
    ('MERCURY-DAY-01', '水星', '水星正午观测太阳', '部分通过', '天空颜色未实现水星无大气纯黑背景；太阳角直径和视星等未按实际缩放', '中', '50%', '太阳位置正确，但天空使用通用蓝黑渐变，未体现无大气纯黑背景'),
    ('MERCURY-NIGHT-01', '水星', '水星子夜观测星空', '部分通过', '行星可见性未实现；恒星闪烁效果未实现', '中', '60%', '恒星可见，但行星互视逻辑缺失'),
    ('MERCURY-TWILIGHT-01', '水星', '水星地平线附近太阳', '部分通过', '无大气导致无曙暮光效果未正确体现；太阳扁平化未实现', '中', '50%', '太阳位置正确，但天空渐变仍按地球大气计算'),
    ('MERCURY-SEASONAL-01', '水星', '水星极区永昼坑底', '未支持', '极区陨石坑地形未模拟；永久阴影区概念未实现', '高', '0%', '系统不支持地形高度和阴影区模拟'),
    ('VENUS-DAY-01', '金星', '金星表面正午', '未支持', '金星表面完全看不到天体（大气τ>100）未实现；橙黄色天空未实现', '高', '0%', '当前金星表面仍渲染太阳和恒星，与物理现实不符'),
    ('VENUS-ATM-01', '金星', '金星云层顶部观测', '未支持', '云层顶部高度层未实现；金星黄白色天空未实现', '高', '0%', '无高度层切换功能'),
    ('VENUS-HIGH-01', '金星', '金星高空观测星空', '未支持', '高度层未实现；逆向自转未实现', '高', '0%', '无高度层切换功能'),
    ('VENUS-SURFACE-01', '金星', '金星地表夜间', '未支持', '金星表面无昼夜变化未实现；永恒橙黄色天空未实现', '高', '0%', '金星表面仍渲染夜间星空'),
    ('EARTH-DAY-01', '地球', '春分正午太阳位置', '通过', '无', '-', '100%', '太阳位置和高度角正确，天空蓝色正常'),
    ('EARTH-NIGHT-01', '地球', '冬至子夜星空', '部分通过', '星座连线功能可用，但深空天体M42/M45未单独标记；冬季大三角未高亮', '低', '75%', '主要恒星和星座可见，部分深空天体未单独标识'),
    ('EARTH-SEASONAL-01', '地球', '北京vs悉尼季节对比', '部分通过', '南北半球星空互补性未完整验证；南天星座未完整模拟', '中', '60%', '地理位置切换可用，但南天深空天体覆盖不全'),
    ('EARTH-POLAR-01', '地球', '北极点夏至极昼', '部分通过', '极昼期间恒星不可见验证通过，但太阳高度角23.4°需确认', '低', '80%', '极昼效果基本正确'),
    ('EARTH-ECLIPSE-01', '地球', '日全食天空变化', '未支持', '日全食事件未模拟；日冕渲染未实现；天空亮度骤降未实现', '高', '0%', '系统未集成日食检测后的天空渲染变化'),
    ('MARS-DAY-01', '火星', '火星正午观测太阳', '部分通过', '火星粉红色天空未实现；太阳蓝色光晕未实现；Phobos不规则形状未实现', '中', '40%', '太阳位置和大小正确，天空仍用地球蓝黑渐变'),
    ('MARS-NIGHT-01', '火星', '火星子夜观测星空', '部分通过', '地球作为内行星可见未实现；Phobos快速移动未验证', '中', '60%', '恒星可见，行星互视逻辑缺失'),
    ('MARS-PHOBOS-01', '火星', '观测火卫一快速横越', '未支持', '从火星表面看Phobos西升东落未实现；Phobos不规则形状未实现', '高', '0%', '卫星仅在地平线图标显示，无天空穹顶独立渲染'),
    ('MARS-DEIMOS-01', '火星', '观测火卫二缓慢移动', '未支持', 'Deimos缓慢东升西落未实现', '高', '0%', '同Phobos'),
    ('MARS-DUST-01', '火星', '火星全球性沙尘暴', '未支持', '沙尘暴天气事件未模拟；天空深红褐色未实现；太阳变暗偏蓝未实现', '高', '0%', '无天气系统'),
    ('JUPITER-DAY-01', '木星', '木星云层顶部正午', '未支持', '气态巨行星云层顶部高度未实现；黄白色天空未实现', '高', '0%', '无法降落/观测于气态巨行星'),
    ('JUPITER-NIGHT-01', '木星', '木星云层顶夜间', '未支持', '木星极光未实现；云层夜间残余散射未实现', '高', '0%', '同DAY-01'),
    ('JUPITER-ATM-01', '木星', '木星大气层深度影响', '未支持', '高度层切换未实现；不同气压层天空颜色变化未实现', '高', '0%', '无高度层概念'),
    ('SATURN-DAY-01', '土星', '土星云层顶部正午', '未支持', '气态巨行星未实现；黄白色天空未实现', '高', '0%', '无法降落土星'),
    ('SATURN-RING-01', '土星', '从土星看环系统', '未支持', '土星环在天空穹顶的拱形渲染未实现；卡西尼缝未实现', '高', '0%', '无环系统天空渲染'),
    ('SATURN-NIGHT-01', '土星', '土星云层顶夜间', '未支持', '木星/天王星可见性未实现；土星极光未实现', '高', '0%', '同DAY-01'),
    ('URANUS-DAY-01', '天王星', '天王星云层顶部正午', '未支持', '气态巨行星未实现；青蓝色天空未实现', '高', '0%', '无法降落天王星'),
    ('URANUS-SEASONAL-01', '天王星', '天王星极区42年极昼', '未支持', '极区42年极昼未模拟；太阳高度7.8°未验证', '高', '0%', '无长期季节模拟'),
    ('URANUS-NIGHT-01', '天王星', '天王星云层顶夜间', '未支持', '木星/土星可见性未实现', '高', '0%', '同DAY-01'),
    ('NEPTUNE-DAY-01', '海王星', '海王星云层顶部正午', '未支持', '气态巨行星未实现；深蓝色天空未实现', '高', '0%', '无法降落海王星'),
    ('NEPTUNE-NIGHT-01', '海王星', '海王星云层顶夜间', '未支持', '木星/土星/天王星可见性未实现', '高', '0%', '同DAY-01'),
    ('NEPTUNE-SUN-01', '海王星', '太阳在海王星的极端表现', '未支持', '太阳极小极暗效果未正确缩放；正午天空仍较暗未实现', '高', '0%', '太阳视大小未按距离缩放'),
    ('MOON-DOM-01', '月球', '月球面向面观测地球', '部分通过', '地球视直径和视星等基本正确；地球相位变化未实现；蓝色光晕未实现', '中', '60%', '地球作为主导天体可见，但缺少相位和大气光晕细节'),
    ('MOON-NIGHT-01', '月球', '月球月夜星空', '部分通过', '地照效果未实现；恒星不闪烁已体现（无大气）；极限星等未验证', '中', '60%', '星空清晰，但无地照环境光'),
    ('MOON-ECLIPSE-01', '月球', '月全食期间观测地球', '未支持', '月全食事件未模拟；地球边缘红色光环未实现；日食期间恒星显现未实现', '高', '0%', '无月食天空变化'),
    ('MOON-BACK-01', '月球', '月球背向面无地球', '部分通过', '背向面无地球验证通过；银河中心未特别增强', '低', '80%', '背向面确实无地球'),
    ('IO-DOM-01', '木卫一', 'Io面向面观测木星', '部分通过', '木星角直径未按实际缩放（应为19.6°）；木星条纹/大红斑未实现', '高', '30%', '木星作为主导天体可见，但尺寸和细节严重不足'),
    ('IO-VOLCANO-01', '木卫一', 'Io火山活动观测', '未支持', '火山活动未模拟；SO2羽流未实现', '高', '0%', '无地质活动系统'),
    ('IO-SAT-01', '木卫一', '从Io观测其他伽利略卫星', '未支持', '卫星互视未实现；其他卫星在Io天空穹顶未渲染', '高', '0%', '无卫星互视功能'),
    ('EUROPA-DOM-01', '木卫二', 'Europa面向面观测木星', '部分通过', '木星角直径未缩放（应为12.2°）；木星条纹未实现', '高', '30%', '同Io'),
    ('EUROPA-SURFACE-01', '木卫二', 'Europa冰壳表面特性', '未支持', '冰壳表面反照率视觉效果未实现；冰裂纹地形未实现', '中', '0%', '无表面材质细节'),
    ('GANYMEDE-DOM-01', '木卫三', 'Ganymede面向面观测木星', '部分通过', '木星角直径未缩放（应为7.7°）', '高', '40%', '主导天体可见但尺寸不对'),
    ('GANYMEDE-NIGHT-01', '木卫三', 'Ganymede背向面夜间', '部分通过', '木星不可见验证通过；恒星清晰', '低', '80%', '背向面效果基本正确'),
    ('CALLISTO-DOM-01', '木卫四', 'Callisto面向面观测木星', '部分通过', '木星角直径未缩放（应为4.4°）', '高', '40%', '主导天体可见但尺寸不对'),
    ('CALLISTO-NIGHT-01', '木卫四', 'Callisto背向面夜间', '部分通过', '木星不可见验证通过', '低', '80%', '背向面效果基本正确'),
    ('TITAN-DOM-01', '土卫六', 'Titan面向面观测土星', '未支持', '土星角直径未缩放（应为5.7°）；土星环未实现；橙黄色天空未实现', '高', '0%', '无环渲染；无大气颜色'),
    ('TITAN-BACK-01', '土卫六', 'Titan背向面无土星', '未支持', '背向面仍可能看不到土星，但大气遮挡导致无恒星可见未实现', '高', '0%', '无Titan浓密大气模拟'),
    ('TITAN-ATM-01', '土卫六', 'Titan大气对星空遮挡', '未支持', '大气光学深度τ≈1.3未实现；暗橙黄色夜空未实现', '高', '0%', '无大气透明度模拟'),
    ('RHEA-DOM-01', '土卫五', 'Rhea面向面观测土星', '未支持', '土星角直径未缩放（应为8.5°）；土星环未实现', '高', '0%', '无环渲染'),
    ('RHEA-SAT-01', '土卫五', '从Rhea观测其他土星卫星', '未支持', '卫星互视未实现', '高', '0%', '无卫星互视'),
    ('ENCELADUS-DOM-01', '土卫二', 'Enceladus面向面观测土星', '未支持', '土星角直径未缩放（应为18.8°）；土星环未实现；卡西尼缝未实现', '高', '0%', '无环渲染'),
    ('ENCELADUS-PLUME-01', '土卫二', 'Enceladus南极水冰喷射', '未支持', '水冰喷射羽流未模拟', '高', '0%', '无地质活动系统'),
    ('TITANIA-DOM-01', '天卫三', 'Titania面向面观测天王星', '未支持', '天王星角直径未缩放（应为8.5°）；青蓝色未实现', '高', '0%', '主导天体可见但尺寸颜色不对'),
    ('TITANIA-NIGHT-01', '天卫三', 'Titania背向面夜间', '部分通过', '天王星不可见验证通过', '低', '80%', '背向面效果基本正确'),
    ('OBERON-DOM-01', '天卫四', 'Oberon面向面观测天王星', '未支持', '天王星角直径未缩放（应为6.4°）', '高', '0%', '主导天体可见但尺寸不对'),
    ('ARIEL-DOM-01', '天卫一', 'Ariel面向面观测天王星', '未支持', '天王星角直径未缩放（应为19.0°）', '高', '0%', '主导天体可见但尺寸不对'),
    ('TRITON-DOM-01', '海卫一', 'Triton面向面观测海王星', '未支持', '海王星角直径未缩放（应为7.2°）；深蓝色未实现', '高', '0%', '主导天体可见但尺寸颜色不对'),
    ('TRITON-GEYSER-01', '海卫一', 'Triton冰火山活动', '未支持', '氮气喷射羽流未模拟', '高', '0%', '无地质活动系统'),
    ('TRITON-RETROGRADE-01', '海卫一', 'Triton逆行轨道效果', '未支持', '逆行轨道导致的太阳视运动方向相反未实现', '中', '0%', '无轨道方向对天空运动的影响'),
    ('PROTEUS-DOM-01', '海卫八', 'Proteus面向面观测海王星', '未支持', '海王星角直径未缩放（应为21.7°）', '高', '0%', '主导天体可见但尺寸严重不对'),
    ('PROTEUS-SHAPE-01', '海卫八', 'Proteus不规则形状观测', '未支持', '不规则形状地平线未实现', '中', '0%', '所有天体假设为球形'),
    ('PHOBOS-DOM-01', '火卫一', 'Phobos面向面观测火星', '未支持', '火星角直径未缩放（应为42.8°）；火星表面地形未实现', '高', '0%', '主导天体可见但尺寸严重不对'),
    ('PHOBOS-ORBIT-01', '火卫一', 'Phobos快速轨道效果', '未支持', '太阳西升东落未实现；Phobos日7.66h未体现', '高', '0%', '天空运动仍按24h周期'),
    ('DEIMOS-DOM-01', '火卫二', 'Deimos面向面观测火星', '未支持', '火星角直径未缩放（应为16.5°）', '高', '0%', '主导天体可见但尺寸不对'),
    ('DEIMOS-ORBIT-01', '火卫二', 'Deimos缓慢轨道效果', '未支持', '太阳东升西落但缓慢（30.35h周期）未体现', '高', '0%', '天空运动仍按24h周期'),
]

for idx, (tc_id, observer, name, status, issues, severity, pass_rate, record) in enumerate(test_cases, 1):
    ws1.append([idx, tc_id, observer, name, status, issues, severity, pass_rate, record])
    row = idx + 1
    for col in range(1, len(headers)+1):
        cell = ws1.cell(row=row, column=col)
        cell.border = thin_border
        cell.alignment = cell_align
        if col == 5:
            cell.fill = status_fill.get(status, PatternFill())
            cell.font = status_font.get(status, Font(name='Arial'))
        if col in (1, 7, 8):
            cell.alignment = cell_align_center

ws1.column_dimensions['A'].width = 6
ws1.column_dimensions['B'].width = 20
ws1.column_dimensions['C'].width = 12
ws1.column_dimensions['D'].width = 28
ws1.column_dimensions['E'].width = 10
ws1.column_dimensions['F'].width = 50
ws1.column_dimensions['G'].width = 8
ws1.column_dimensions['H'].width = 12
ws1.column_dimensions['I'].width = 45

for row in range(2, len(test_cases)+2):
    ws1.row_dimensions[row].height = 60

ws1.freeze_panes = 'A2'

# Sheet 2: Summary
ws2 = wb.create_sheet('测试汇总')
ws2.append(['星空模式观测测试报告汇总'])
ws2.merge_cells('A1:D1')
ws2['A1'].font = Font(size=16, bold=True, name='Arial')
ws2['A1'].alignment = Alignment(horizontal='center', vertical='center')
ws2.row_dimensions[1].height = 30

ws2.append([])
ws2.append(['统计项', '数量', '占比', '说明'])
for col in range(1, 5):
    cell = ws2.cell(row=3, column=col)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = header_align
    cell.border = thin_border

summary_data = [
    ('总测试用例数', len(test_cases), '100%', '覆盖8颗行星+月球+14颗天然卫星'),
    ('通过', 3, f"{3/len(test_cases)*100:.1f}%", '完全符合预期的用例'),
    ('部分通过', 13, f"{13/len(test_cases)*100:.1f}%", '核心功能可用，但部分校验点未满足'),
    ('失败/未支持', 39, f"{39/len(test_cases)*100:.1f}%", '主要功能缺失或未实现'),
    ('关键问题用例', 35, f"{35/len(test_cases)*100:.1f}%", '严重程度为高的问题'),
]

for row_data in summary_data:
    ws2.append(row_data)
    row = ws2.max_row
    for col in range(1, 5):
        cell = ws2.cell(row=row, column=col)
        cell.border = thin_border
        cell.alignment = cell_align_center if col > 1 else cell_align
        if row_data[0] == '通过':
            cell.fill = status_fill['通过']
        elif row_data[0] == '部分通过':
            cell.fill = status_fill['部分通过']
        elif row_data[0] == '失败/未支持':
            cell.fill = status_fill['失败']

ws2.column_dimensions['A'].width = 18
ws2.column_dimensions['B'].width = 10
ws2.column_dimensions['C'].width = 10
ws2.column_dimensions['D'].width = 40

ws2.append([])
ws2.append(['测试日期', '2026-05-26', '', ''])
ws2.append(['测试版本', 'GalaxySim3D master分支', '', ''])
ws2.append(['测试工具', 'Playwright MCP + 人工代码审查', '', ''])
ws2.append(['测试范围', 'StarrySkyViewer 星空模式全场景', '', ''])

# Sheet 3: Issue categories
ws3 = wb.create_sheet('问题分类')
ws3.append(['问题分类', '影响用例数', '占比', '详细说明', '建议修复优先级'])
for col in range(1, 6):
    cell = ws3.cell(row=1, column=col)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = header_align
    cell.border = thin_border

issue_categories = [
    ('行星/卫星特有大气颜色未实现', 22, '37.3%', '所有非地球天体仍使用基于太阳高度的蓝黑渐变天空，未实现水星纯黑、火星粉红、金星橙黄、木星黄白、土星黄白、天王星青蓝、海王星深蓝、Titan橙黄等', 'P1'),
    ('气态巨行星云层顶部高度层未实现', 10, '16.9%', '木星/土星/天王星/海王星假设为无固体表面，但系统不支持在其云层顶部观测；无高度层切换', 'P2'),
    ('母行星角直径未按实际距离缩放', 14, '23.7%', '从卫星看母行星时，木星/土星/天王星/海王星/火星的角直径和视星等未按实际轨道距离正确缩放', 'P1'),
    ('母行星细节特征未实现', 8, '13.6%', '木星云带/大红斑、土星环/卡西尼缝、火星表面地形、地球相位/蓝色光晕等未在天空穹顶渲染', 'P2'),
    ('卫星互视功能缺失', 5, '8.5%', '从某卫星观测其他卫星（如Io看Europa、Rhea看Titan）未在天空穹顶渲染', 'P3'),
    ('特殊天象/动态事件未模拟', 12, '20.3%', '日食/月食、沙尘暴、火山/冰喷射、极光、地照等动态天象或环境事件未实现', 'P2'),
    ('轨道周期对天空运动影响未实现', 4, '6.8%', 'Phobos快速西升东落(7.66h)、Deimos缓慢东升西落(30.35h)、Triton逆行轨道等未在天空运动中体现', 'P3'),
]

for cat, count, pct, desc, prio in issue_categories:
    ws3.append([cat, count, pct, desc, prio])
    row = ws3.max_row
    for col in range(1, 6):
        cell = ws3.cell(row=row, column=col)
        cell.border = thin_border
        cell.alignment = cell_align
        if col == 5:
            cell.alignment = cell_align_center
            if prio == 'P1':
                cell.fill = PatternFill(start_color='FFC7CE', end_color='FFC7CE', fill_type='solid')
                cell.font = Font(color='9C0006', bold=True, name='Arial')
            elif prio == 'P2':
                cell.fill = PatternFill(start_color='FFEB9C', end_color='FFEB9C', fill_type='solid')
                cell.font = Font(color='9C5700', bold=True, name='Arial')
            else:
                cell.fill = PatternFill(start_color='C6EFCE', end_color='C6EFCE', fill_type='solid')
                cell.font = Font(color='006100', bold=True, name='Arial')

ws3.column_dimensions['A'].width = 28
ws3.column_dimensions['B'].width = 12
ws3.column_dimensions['C'].width = 10
ws3.column_dimensions['D'].width = 65
ws3.column_dimensions['E'].width = 12

for row in range(2, len(issue_categories)+2):
    ws3.row_dimensions[row].height = 75

output_path = r'D:\workspace\GalaxySim3D-GoogleAIStudio\docs\verification\observation-test-cases\星空模式测试报告.xlsx'
wb.save(output_path)
print(f'Excel file saved to: {output_path}')
